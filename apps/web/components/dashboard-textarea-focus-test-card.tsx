"use client"

import { useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function DashboardTextareaFocusTestCard() {
  const [inputValue, setInputValue] = useState("")
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const checkboxOptions = ["Aortic regurgitation", "Mitral regurgitation", "Pericardial effusion"]

  const mirroredValue = [inputValue.trim(), selectedOptions.join(", ")]
    .filter(Boolean)
    .join(". ")
    .concat(inputValue.trim() || selectedOptions.length ? "." : "")

  const toggleOption = (option: string, checked: boolean) => {
    setSelectedOptions((current) => {
      const next = new Set(current)
      if (checked) next.add(option)
      else next.delete(option)
      return Array.from(next)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Textarea Focus Test</CardTitle>
        <CardDescription>
          Type in the textarea and toggle checkboxes while focus remains stable and the disabled result mirror updates.
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
          <Label>Checkbox inputs</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {checkboxOptions.map((option) => {
              const checked = selectedOptions.includes(option)
              return (
                <label key={option} className="inline-flex items-center gap-2 rounded border p-2 hover:bg-muted/30">
                  <Checkbox checked={checked} onCheckedChange={(value) => toggleOption(option, value === true)} />
                  <span className="text-sm leading-tight">{option}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="disabled-textarea">Disabled result textarea</Label>
          <Textarea
            id="disabled-textarea"
            value={mirroredValue}
            disabled
            readOnly
            placeholder="Mirrored value appears here"
          />
        </div>
      </CardContent>
    </Card>
  )
}
