export class InvalidAuthTokenError extends Error {
    constructor(message: "Invalid Token") {
        super(message);
        this.name = "InvalidAuthTokenError"
    }
}
