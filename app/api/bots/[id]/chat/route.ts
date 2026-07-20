import { createServiceClient } from '@/lib/supabase/server'
import { streamChat, createEmbedding, MODE_PROMPTS, type ChatMessage } from '@/lib/ai-providers'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { id: botId } = await params
  const enc = new TextEncoder()
  const dec = new TextDecoder()

  const { message, conversationId, images } = await req.json() as {
    message: string
    conversationId?: string
    images?: string[]
  }

  const supabase = createServiceClient()

  // 1. Load bot config
  const { data: bot, error: botErr } = await supabase
    .from('bots')
    .select('*')
    .eq('id', botId)
    .single()

  if (botErr || !bot) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'Bot no encontrado' })}\n\n`,
      { status: 404, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  // 2. Resolve or create conversation
  let convId = conversationId
  if (!convId) {
    const { data: conv } = await supabase
      .from('bot_conversations')
      .insert({ bot_id: botId, title: message.slice(0, 60) })
      .select('id')
      .single()
    convId = conv?.id
  }

  // 3. Load history + documents catalog in parallel
  const [historyRes, docsRes] = await Promise.all([
    supabase
      .from('bot_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(20),
    supabase
      .from('bot_documents')
      .select('id, name, type, original_url, file_path, status, chunk_count')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false }),
  ])

  const history = historyRes.data ?? []
  const allDocs = docsRes.data ?? []
  const readyDocs = allDocs.filter(d => d.status === 'ready')

  // 4. RAG — vector search for relevant chunks
  let ragContext = ''
  let matchedDocIds: string[] = []
  const embKey = bot.embedding_key || (bot.provider === 'openai' ? bot.api_key : '')

  if (embKey && readyDocs.length > 0) {
    try {
      const embedding = await createEmbedding(message, embKey)
      const hasImages = !!(images && images.length)
      const isCotizadorBot = bot.mode === 'cotizador'
      const { data: chunks } = await supabase.rpc('match_bot_chunks', {
        query_embedding: embedding,
        match_bot_id: botId,
        match_threshold: hasImages ? 0.10 : isCotizadorBot ? 0.20 : 0.35,
        match_count: hasImages ? 20 : isCotizadorBot ? 20 : 10,
      })
      if (chunks?.length) {
        // Build a doc name lookup map for attribution
        const docNameMap: Record<string, string> = {}
        for (const d of allDocs) docNameMap[d.id] = d.name

        // Include source document name with each chunk so the bot knows WHICH catalog each price comes from
        ragContext = chunks
          .map((c: { content: string; document_id: string }) => {
            const srcDoc = docNameMap[c.document_id] ?? 'Documento'
            return `📄 **[FUENTE: ${srcDoc}]**\n${c.content}`
          })
          .join('\n\n---\n\n')

        matchedDocIds = [...new Set<string>(chunks.map((c: { document_id: string }) => c.document_id))]
      }
    } catch { /* RAG optional */ }
  }

  // 5. Build document catalog block for system prompt
  const baseUrl = 'https://svcaqqojjowzuivqplho.supabase.co/storage/v1/object/public/bot-documents'
  const docCatalog = allDocs.map(d => {
    const url = d.original_url || (d.file_path ? `${baseUrl}/${d.file_path}` : null)
    const status = d.status === 'ready' ? '✅' : '⏳'
    return `${status} [${d.name}]${url ? `(${url})` : ''} — tipo: ${d.type}, chunks: ${d.chunk_count ?? 0}`
  }).join('\n')

  // 6. Build system prompt
  const modePrompt = MODE_PROMPTS[bot.mode] ?? MODE_PROMPTS.general
  const personality = bot.personality ? `\n\nPersonalidad: ${bot.personality}` : ''
  const customPrompt = bot.system_prompt ? `\n\n${bot.system_prompt}` : ''

  const docBlock = allDocs.length > 0
    ? `\n\n## Documentos disponibles en la base de conocimiento:\nCuando compartas un documento SIEMPRE usa este formato exacto de markdown:\n[NOMBRE-ARCHIVO.pdf](URL)\n\n${docCatalog}`
    : ''

  const ragBlock = ragContext
    ? `\n\n## INFORMACION EXTRAIDA DE LOS CATALOGOS (cada fragmento indica su FUENTE — usa el precio de la fuente correcta para cada marca/proveedor):\n${ragContext}`
    : (readyDocs.length === 0 && allDocs.length > 0
      ? '\n\n## Nota: Los documentos estan siendo procesados.'
      : '')

  // Cotizador mode: specialized prompt
  const isCotizador = bot.mode === 'cotizador'
  const cotizadorPrompt = isCotizador ? `

---
## ROL
Eres cotizador experto y director comercial de una agencia de decoracion integral en Peru (cortinas, persianas, pisos, revestimientos). Genera cotizaciones precisas, con identidad de producto exacta del catalogo, formato compacto y visual.

El % de ganancia y TC vienen en [CONFIGURACION:...]. Sin configuracion: margen 30%, TC S/ 3.72.

---
## REGLA CRITICA — PRECIOS POR FUENTE

Cada fragmento de informacion tiene una etiqueta [FUENTE: nombre-archivo.pdf]. Cuando compares precios entre marcas o proveedores:
- USA EXCLUSIVAMENTE el precio que aparece en el fragmento de ESA fuente especifica
- NUNCA uses el precio de un proveedor para otro
- Si dos PDFs tienen precios distintos para el mismo producto, muestra CADA precio de su respectiva fuente
- Si en el texto de una fuente aparece "$55.00" y en otra fuente aparece "$28.50", son precios DISTINTOS de marcas DISTINTAS — no los iguales
- Antes de cotizar, verifica que el precio que usas coincide con el nombre del proveedor/PDF de donde lo extrajiste

---
## MATEMATICA OBLIGATORIA (aplica siempre en este orden)
Paso A: Costo Total Proveedor (con IGV) = Area x Precio Catalogo x TC
Paso B: Costo Base sin IGV = Paso A / 1.18
Paso C: Ganancia = Paso B x (% / 100)
Paso D: Subtotal Venta = Paso B + Paso C
Paso E: IGV Final = Paso D x 0.18
Paso F: Precio Final Cliente = Paso D + Paso E

Reglas: precios del catalogo en USD incluyen IGV. Minimo 1.00 m2 por pano / 1.00 ml para rieles.

---
## IDENTIFICACION DE PRODUCTO — CRITICO

ANTES de cotizar, SIEMPRE extrae del PDF/catalogo para CADA variante:
- Nombre exacto del producto (ej: "Persiana Vertical PVC 50mm", "Persiana Vertical Aluminio 90mm Texturado")
- Codigo o referencia del catalogo (ej: "ALX-V50-PVC", "ARONI-V90-ALU")
- Precio por m2 en USD (del catalogo)
- Caracteristicas: material, ancho de lamina, acabado, colores disponibles
- Proveedor (Alrex, Aroni, etc.)

Si el usuario pide "persianas verticales" sin especificar tipo, LISTA TODAS las variantes disponibles en el catalogo con sus precios, y cotiza cada una por separado.

---
## FORMATO DE RESPUESTA — COMPACTO Y CON EMOJIS

### MEDIDAS (si hay multiples espacios)
| N° | Descripcion | Ancho | Alto | m² |
|---|---|---|---|---|
| 1 | Ventana principal | 2.50m | 2.10m | 5.25 m² |
| 2 | Ventana lateral | 1.20m | 2.10m | 2.52 m² |
| | **TOTAL** | | | **7.77 m²** |
*Nota tecnica si aplica: minimos, panos, consideraciones.*

---

### 📋 OPCION [N] — [NOMBRE EXACTO DEL PRODUCTO]
**🏷️ Identificacion:** [Codigo catalogo] | [Proveedor]
**📐 Material/Lamina:** [material, ancho lamina, acabado]
**🎨 Colores disponibles:** [lista compacta del catalogo]
**📦 Precio catalogo:** $X.XX USD/m2 (incl. IGV)

> 💼 *Costo proveedor interno: $X.XX USD = S/ X,XXX.XX (TC S/ X.XX)*

**💰 Desglose para el Cliente:**
✅ Costo Base (sin IGV): S/ X,XXX.XX
✅ Ganancia Agencia ([X]%): S/ X,XXX.XX
✅ Subtotal Venta: S/ X,XXX.XX
✅ IGV (18%): S/ X,XXX.XX
**💵 Precio Final al Cliente: S/ X,XXX.XX** *(S/ XX.XX/m²)*

---

### 📊 COMPARATIVA DE OPCIONES
| | [Opcion 1] | [Opcion 2] | [Opcion 3] |
|---|---|---|---|
| 📄 Fuente/Catalogo | [nombre PDF] | [nombre PDF] | [nombre PDF] |
| 🏷️ Codigo | [cod catalogo] | [cod catalogo] | [cod catalogo] |
| 📐 Material | [material] | [material] | [material] |
| 📏 Lamina | [ancho] | [ancho] | [ancho] |
| 💲 Precio catalogo | $XX.XX/m² | $XX.XX/m² | $XX.XX/m² |
| 💵 Precio Final Cliente | S/ X,XXX | S/ X,XXX | S/ X,XXX |
| 📈 Precio/m² | S/ XX.XX | S/ XX.XX | S/ XX.XX |
| ⭐ Diferencia clave | [dato] | [dato] | [dato] |

---

### 💡 RECOMENDACION DEL ASESOR
> [Una sola recomendacion clara: cual elegir, por que, ventaja principal, cuidado/instalacion]
> *¿Coordinamos visita tecnica para medicion exacta?* 📍

---
## REGLAS CRITICAS DE FORMATO
- **SIN lineas en blanco extra entre bullets** — los items van uno seguido del otro
- Cada opcion empieza con ### y emoji
- Usa ✅ para cada item del desglose de precio (NO guiones)
- SIEMPRE muestra codigo + nombre exacto del catalogo para cada producto
- Si no hay codigo en el catalogo, indica el nombre completo como aparece en el PDF
- Si el usuario pide una categoria (persianas, pisos, cortinas): lista TODOS los productos de esa categoria con tabla completa antes de cotizar
- IMAGEN adjunta: identifica tipo de espacio, estima medidas (puerta ~2.10m, ventana ~1.20m), recomienda producto, indica "⚠️ Medidas estimadas — confirmar en sitio"
- Precios solo del catalogo. Si no existe: "Consultar precio actualizado"
- Si faltan medidas, pregunta antes de cotizar` : `

## INSTRUCCIONES
Eres asesor experto en decoracion de interiores. Responde de forma profesional, amigable y concisa.
- Usa informacion de los documentos para responder con precision.
- Tablas markdown para comparar productos o precios.
- Nunca inventes precios; indica "Consultar" si no estan en documentos.
- Documentos: [NOMBRE.pdf](URL)`

  const systemPrompt = `${modePrompt}${personality}${customPrompt}${docBlock}${ragBlock}${cotizadorPrompt}

## Formato de respuesta:
- NO uses "###" ni "##" ni "#" para titulos. Usa **negrita** para los subtitulos (ej: **Productos recomendados**).
- Mantén la respuesta ordenada con subtitulos en negrita, listas y emojis.
- Documentos en formato: [NOMBRE.pdf](URL)
Responde en ${bot.language === 'es' ? 'espanol' : bot.language === 'en' ? 'ingles' : 'portugues'}`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))),
    { role: 'user', content: message, images: images && images.length ? images : undefined },
  ]

  // 7. Save user message (include image markdown so it shows in history)
  const savedContent = images && images.length
    ? `${message}\n\n${images.map(u => `![imagen](${u})`).join('\n')}`
    : message
  await supabase.from('bot_messages').insert({
    conversation_id: convId,
    bot_id: botId,
    role: 'user',
    content: savedContent,
  })

  // 8. Stream response
  let fullResponse = ''

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      try {
        ctrl.enqueue(enc.encode(
          `data: ${JSON.stringify({ type: 'meta', conversationId: convId })}\n\n`
        ))

        const aiStream = await streamChat(messages, {
          provider: bot.provider,
          model: bot.model,
          apiKey: bot.api_key,
          temperature: Number(bot.temperature),
          maxTokens: bot.max_tokens,
        })

        const reader = aiStream.getReader()
        let sseBuffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          sseBuffer += dec.decode(value, { stream: true })
          const parts = sseBuffer.split('\n\n')
          sseBuffer = parts.pop() ?? ''

          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6)
            if (raw === '[DONE]') continue
            try {
              const json = JSON.parse(raw)
              const token: string = json.choices?.[0]?.delta?.content ?? ''
              if (token) {
                fullResponse += token
                ctrl.enqueue(enc.encode(
                  `data: ${JSON.stringify({ type: 'token', content: token })}\n\n`
                ))
              }
            } catch { /* skip */ }
          }
        }

        // Save assistant message
        const { data: saved } = await supabase
          .from('bot_messages')
          .insert({ conversation_id: convId, bot_id: botId, role: 'assistant', content: fullResponse })
          .select('id')
          .single()

        // Update conversation + stats
        await Promise.all([
          supabase.from('bot_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId),
          supabase.from('bots').update({
            total_messages: bot.total_messages + 2,
            total_conversations: convId === conversationId ? bot.total_conversations : bot.total_conversations + 1,
          }).eq('id', botId),
        ])

        ctrl.enqueue(enc.encode(
          `data: ${JSON.stringify({ type: 'done', messageId: saved?.id, conversationId: convId, matchedDocs: matchedDocIds })}\n\n`
        ))
      } catch (err) {
        ctrl.enqueue(enc.encode(
          `data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`
        ))
      } finally {
        ctrl.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
