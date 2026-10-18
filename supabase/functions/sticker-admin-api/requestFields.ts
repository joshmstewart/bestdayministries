export function withoutRoutingFields(body: Record<string, unknown>) {
  const { action: _action, sticker_id: _stickerId, ...fields } = body;
  return fields;
}

export function databaseErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Unexpected server error';
}