'use client'

import { useEffect, useState } from 'react'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getFeedbackMessages, updateFeedbackMessage } from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const statusOptions = ['new', 'reviewed', 'closed'] as const

type FeedbackItem = {
  id: string
  attributes: {
    message: string
    page_url?: string | null
    status: 'new' | 'reviewed' | 'closed'
    created_at: string
    user_name?: string | null
    user_email?: string | null
  }
}

export default function FeedbackPage() {
  const [rows, setRows] = useState<FeedbackItem[]>([])

  useEffect(() => {
    getFeedbackMessages().then((res) => setRows(res?.data ?? []))
  }, [])

  const onStatusChange = async (id: string, status: 'new' | 'reviewed' | 'closed') => {
    await updateFeedbackMessage(id, { status })
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, attributes: { ...row.attributes, status } } : row)))
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Feedback' }]} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{new Date(row.attributes.created_at).toLocaleString()}</TableCell>
                <TableCell>{row.attributes.user_name ?? row.attributes.user_email ?? 'Unknown'}</TableCell>
                <TableCell className="max-w-[320px] truncate">{row.attributes.message}</TableCell>
                <TableCell className="max-w-[280px] truncate">{row.attributes.page_url ?? '-'}</TableCell>
                <TableCell>{row.attributes.status}</TableCell>
                <TableCell>
                  <Select value={row.attributes.status} onValueChange={(value) => onStatusChange(row.id, value as 'new' | 'reviewed' | 'closed')}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
