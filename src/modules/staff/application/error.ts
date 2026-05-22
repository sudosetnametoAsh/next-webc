export class NotFoundError extends Error {
    constructor(message = "Resource not found") {
        super(message);
        this.name = "NotFoundError"
    }
}

export class DatabaseError extends Error {
    constructor(message = "Database Error") {
        super(message);
        this.name = "DatabaseError";
    }
}
