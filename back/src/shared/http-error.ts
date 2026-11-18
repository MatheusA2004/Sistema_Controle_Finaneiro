// Erro com status HTTP. Lance em qualquer rota/serviço e o error handler do server.ts responde.
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
