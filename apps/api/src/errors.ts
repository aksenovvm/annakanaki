import type { FastifyInstance } from "fastify";
import { ZodError, z } from "zod";
import type { ApiErrorBody } from "@barbershop/shared";

/**
 * Ожидаемая ошибка, о которой нужно честно сказать клиенту:
 * throw new AppError(404, "BARBER_NOT_FOUND", "Барбер не найден")
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Все ошибки API отдаются в одном формате: { code, message, details? } */
export function registerErrorHandlers(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    let status = 500;
    let body: ApiErrorBody = { code: "INTERNAL_ERROR", message: "Внутренняя ошибка сервера" };

    if (error instanceof AppError) {
      status = error.statusCode;
      body = { code: error.code, message: error.message, details: error.details };
    } else if (error instanceof ZodError) {
      // Неверные входные данные (параметры, query, тело запроса)
      status = 400;
      body = { code: "VALIDATION_ERROR", message: "Неверные данные запроса", details: z.flattenError(error) };
    } else if (typeof error === "object" && error !== null && "statusCode" in error) {
      // Ошибки самого Fastify: битый JSON, слишком большое тело и т.п.
      const statusCode = Number(error.statusCode);
      if (statusCode >= 400 && statusCode < 500) {
        status = statusCode;
        body = { code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Неверный запрос" };
      }
    }

    if (status >= 500) {
      // Подробности — только в лог сервера, клиенту их показывать нельзя
      request.log.error({ err: error }, "Необработанная ошибка");
    }
    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ApiErrorBody = { code: "NOT_FOUND", message: `Нет такого адреса: ${request.method} ${request.url}` };
    return reply.status(404).send(body);
  });
}
