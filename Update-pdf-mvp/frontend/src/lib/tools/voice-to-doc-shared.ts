// Client-safe constants — no server-only imports.
// Server-side processing code lives in voice-to-doc.ts.

export const DOC_TYPES = {
  "meeting-notes": {
    label: "Meeting Notes",
    description: "Transcribe a meeting and extract decisions, action items, and next steps.",
    icon: "Users",
    prompt: `Format this meeting transcript into professional meeting notes with these sections:
## Meeting Summary
## Attendees (if mentioned)
## Key Decisions
## Action Items (with owners if mentioned)
## Next Steps
Clean up filler words. Be concise and professional.`,
  },
  "essay-draft": {
    label: "Essay / Article",
    description: "Speak your ideas, get a structured essay with intro, body, and conclusion.",
    icon: "PenLine",
    prompt: `Format this spoken content into a well-structured essay or article with:
## Title (infer from content)
## Introduction
## Body (2-4 paragraphs with clear topic sentences)
## Conclusion
Fix grammar, remove filler words, improve flow. Maintain the speaker's voice and ideas.`,
  },
  "interview": {
    label: "Interview Transcript",
    description: "Clean up interview audio with speaker labels and key highlights.",
    icon: "Mic2",
    prompt: `Format this interview transcript professionally:
- Clean up filler words (um, uh, like) but keep natural speech patterns
- Add [Interviewer] and [Interviewee] labels where distinguishable
- Add a ## Key Highlights section at the end with 3-5 notable quotes or points
- Preserve the conversational structure`,
  },
  "lecture-notes": {
    label: "Lecture / Study Notes",
    description: "Record a lecture and get organized study notes with key concepts.",
    icon: "GraduationCap",
    prompt: `Convert this lecture recording into structured study notes:
## Topic
## Key Concepts (with brief definitions)
## Main Points
## Examples Mentioned
## Summary
Use bullet points. Highlight important terms in **bold**.`,
  },
  "business-report": {
    label: "Business Report",
    description: "Dictate findings and get a professionally formatted business report.",
    icon: "BarChart2",
    prompt: `Format this dictated content into a professional business report:
## Executive Summary
## Background / Context
## Findings
## Recommendations
## Conclusion
Use formal business language. Clean up spoken language to professional writing.`,
  },
  "email-draft": {
    label: "Email / Letter",
    description: "Speak your email casually, get it rewritten in professional tone.",
    icon: "Mail",
    prompt: `Convert this spoken content into a professional email or letter:
- Add Subject: line
- Professional greeting
- Clear concise body paragraphs
- Professional closing
Remove all filler words. Fix grammar. Keep it brief and actionable.`,
  },
  "todo-list": {
    label: "To-Do List",
    description: "Brain-dump into a mic, get a prioritized action list.",
    icon: "ListChecks",
    prompt: `Convert this voice memo into an organized to-do list:
## Today (urgent/important)
## This Week
## Someday / Maybe
Extract every task, project, or commitment mentioned. Use checkboxes: [ ] item. Be concise.`,
  },
  "raw-transcript": {
    label: "Raw Transcript",
    description: "Clean verbatim transcript with timestamps and no AI reformatting.",
    icon: "FileText",
    prompt: `Lightly clean this transcript:
- Fix obvious transcription errors
- Add paragraph breaks at natural pauses
- Keep all content verbatim otherwise
- Do NOT summarize or restructure`,
  },
} as const;

export type DocTypeKey = keyof typeof DOC_TYPES;
