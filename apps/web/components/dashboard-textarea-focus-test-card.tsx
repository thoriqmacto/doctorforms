"use client"

import { useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function DashboardTextareaFocusTestCard() {
  const [inputValue, setInputValue] = useState("")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Textarea Focus Test</CardTitle>
        <CardDescription>
          Type in the enabled textarea and confirm focus remains while the disabled mirror updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="enabled-textarea">Enabled textarea</Label>
          <Textarea
            id="enabled-textarea"
            placeholder="Type here to test focus behavior..."
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="disabled-textarea">Disabled mirror textarea</Label>
          <Textarea
            id="disabled-textarea"
            value={inputValue}
            disabled
            readOnly
            placeholder="Mirrored value appears here"
          />
        </div>
      </CardContent>
    </Card>
  )
}
