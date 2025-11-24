type ValidationRule<T> = (value: T) => string | null

type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[]
}

interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validateObject<T extends Record<string, any>>(obj: T, schema: ValidationSchema<T>): ValidationResult {
  const errors: Record<string, string> = {}

  for (const key in schema) {
    const rules = schema[key] || []
    const value = obj[key]

    for (const rule of rules) {
      const error = rule(value)
      if (error) {
        errors[key] = error
        break
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function required<T>(message = "This field is required") {
  return (value: T): string | null => {
    if (value === undefined || value === null || value === "") {
      return message
    }
    return null
  }
}

export function minLength(min: number, message?: string) {
  return (value: string): string | null => {
    if (!value || value.length < min) {
      return message || `Must be at least ${min} characters`
    }
    return null
  }
}

export function maxLength(max: number, message?: string) {
  return (value: string): string | null => {
    if (value && value.length > max) {
      return message || `Must be no more than ${max} characters`
    }
    return null
  }
}

export function isEmail(message = "Invalid email address") {
  return (value: string): string | null => {
    if (!value) return null

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return message
    }
    return null
  }
}

export function isNumber(message = "Must be a number") {
  return (value: any): string | null => {
    if (value === undefined || value === null || value === "") return null

    if (typeof value !== "number" && isNaN(Number(value))) {
      return message
    }
    return null
  }
}

export function min(minValue: number, message?: string) {
  return (value: number): string | null => {
    if (value === undefined || value === null) return null

    if (value < minValue) {
      return message || `Must be at least ${minValue}`
    }
    return null
  }
}

export function max(maxValue: number, message?: string) {
  return (value: number): string | null => {
    if (value === undefined || value === null) return null

    if (value > maxValue) {
      return message || `Must be no more than ${maxValue}`
    }
    return null
  }
}

export function matches(pattern: RegExp, message = "Invalid format") {
  return (value: string): string | null => {
    if (!value) return null

    if (!pattern.test(value)) {
      return message
    }
    return null
  }
}

