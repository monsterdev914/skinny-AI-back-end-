interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}
declare class EmailService {
    private transporter;
    constructor();
    sendEmail(options: EmailOptions): Promise<void>;
    sendVerificationEmail(email: string, token: string): Promise<void>;
    sendPasswordResetEmail(email: string, token: string): Promise<void>;
    sendWelcomeEmail(email: string, firstName?: string): Promise<void>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=email.d.ts.map