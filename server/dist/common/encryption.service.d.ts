export declare class EncryptionService {
    private readonly algorithm;
    generateRoomKey(): string;
    encrypt(plaintext: string, keyBase64: string): {
        encrypted: string;
        iv: string;
        authTag: string;
    };
    decrypt(encryptedBase64: string, ivBase64: string, authTagBase64: string, keyBase64: string): string;
}
