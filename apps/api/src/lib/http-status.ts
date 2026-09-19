import { ErrorCode } from "@repo/types";

// Maps a service's error code to the HTTP status the controller should send.
export function statusForErrorCode(code: string): number {
  switch (code) {
    case ErrorCode.UNAUTHORIZED:
      return 401;
    case ErrorCode.FORBIDDEN:
      return 403;
    case ErrorCode.NOT_FOUND:
      return 404;
    case ErrorCode.CONFLICT:
    case ErrorCode.DUPLICATE_ENTRY:
      return 409;
    case ErrorCode.INTERNAL_SERVER_ERROR:
      return 500;
    default:
      return 400;
  }
}
