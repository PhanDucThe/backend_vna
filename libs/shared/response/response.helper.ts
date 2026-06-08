export class ResponseHelper {
  static success<T>(message: string, data?: T) {
    return {
      success: true,
      message,
      data: data ?? null,
    };
  }

  static error(message: string, error?: unknown) {
    return {
      success: false,
      message,
      error: error ?? null,
    };
  }
}
