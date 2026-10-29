interface FieldErrorProps {
  id: string;
  message?: string;
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}
