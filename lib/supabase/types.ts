export interface Contact {
  id: string
  phone: string
  name: string | null
  created_at: string
  ad_source: string | null
  ctwa_clid: string | null
  blocked: boolean
  bot_active: boolean
}

export interface Message {
  id: string
  contact_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  whatsapp_message_id: string | null
  status: 'sent' | 'delivered' | 'read' | 'failed' | null
}

export interface Lead {
  id: string
  contact_id: string
  score: 'hot' | 'warm' | 'cold'
  reason: string
  qualified_at: string
  notified: boolean
}

export interface Setting {
  key: string
  value: string
}

export interface ConversationWithLead extends Contact {
  last_message: string | null
  last_message_at: string | null
  message_count: number
  lead_score: 'hot' | 'warm' | 'cold' | null
}
