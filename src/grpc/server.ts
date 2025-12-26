import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { join } from "path";
import { sendHandler } from "./handlers";
import { env } from "../config";

const PROTO_PATH = join(import.meta.dir, "protos/mailer.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const mailerPackage = protoDescriptor.mailer;

export const startGrpcServer = () => {
    const server = new grpc.Server();

    server.addService(mailerPackage.MailerService.service, {
        Send: sendHandler
    });

    const port = process.env.GRPC_PORT || "50051";
    const address = `0.0.0.0:${port}`;

    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error(`[gRPC] Failed to listgen on ${address}:`, err);
            return;
        }
        console.log(`[gRPC] Server running at ${address}`);

    });
};

// Auto-start if imported directly (optional, but we control via index.ts)
