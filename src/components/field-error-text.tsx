import { FieldError } from "@/components/ui/field"

/** Field message linked to its control through aria-describedby (id = <field>-error). */
export function FieldErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null
  }
  return <FieldError id={id}>{message}</FieldError>
}

export function errorProps(errors: Record<string, string>, field: string, idPrefix = "") {
  const message = errors[field]
  const errorId = idPrefix + field + "-error"
  return {
    message,
    errorId,
    invalid: Boolean(message),
    controlProps: {
      "aria-invalid": message ? (true as const) : undefined,
      "aria-describedby": message ? errorId : undefined,
    },
  }
}

