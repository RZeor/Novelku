import { NextResponse } from 'next/server';

// ============================================================
// Consistent API Response Helpers
// ============================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ---- Success Responses ----

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    { success: true, data },
    { status }
  );
}

export function createdResponse<T>(data: T) {
  return successResponse(data, 201);
}

// ---- Error Responses ----

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, message },
    { status }
  );
}

export function unauthorizedResponse(message: string = 'Unauthorized') {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message: string = 'Forbidden') {
  return errorResponse(message, 403);
}

export function notFoundResponse(message: string = 'Not found') {
  return errorResponse(message, 404);
}

export function conflictResponse(message: string = 'Conflict') {
  return errorResponse(message, 409);
}

export function serverErrorResponse(message: string = 'Internal server error') {
  return errorResponse(message, 500);
}
