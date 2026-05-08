'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { createFeedback } from '@/lib/api'

export default function Footer() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const onSubmit = async () => {
    if (!message.trim()) {
      setStatus({ type: 'error', text: 'Please enter your feedback before submitting.' })
      return
    }

    setSubmitting(true)
    setStatus(null)

    try {
      await createFeedback({ message: message.trim(), page_url: window.location.href })
      setStatus({ type: 'success', text: 'Thank you! Your feedback has been submitted.' })
      setMessage('')
    } catch {
      setStatus({ type: 'error', text: 'Failed to submit feedback. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <footer className="border-t px-4 py-3 text-sm text-muted-foreground flex items-center justify-between">
      <span>&copy; {new Date().getFullYear()} DoctorForms</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">Feedback</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send feedback</DialogTitle>
            <DialogDescription>Tell us what happened or what we can improve.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Share your feedback..."
            rows={6}
            maxLength={5000}
            disabled={submitting}
          />
          {status ? <p className={status.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-green-600'}>{status.text}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={onSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </footer>
  )
}
