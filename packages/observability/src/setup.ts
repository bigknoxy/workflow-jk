import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { setupMetrics, shutdownMetrics } from "./metrics";

export interface ObservabilityConfig {
  serviceName: string;
  otlpEndpoint?: string;
  prometheusPort?: number;
  enabled?: boolean;
}

let sdk: NodeSDK | undefined;

export function setupObservability(config: ObservabilityConfig): void {
  if (config.enabled === false) {
    setupMetrics(config.prometheusPort);
    return;
  }

  const traceExporter = config.otlpEndpoint
    ? new OTLPTraceExporter({ url: config.otlpEndpoint })
    : undefined;

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
    }),
    traceExporter,
  });

  sdk.start();

  setupMetrics(config.prometheusPort);

  process.on("SIGTERM", () => {
    sdk?.shutdown();
    shutdownMetrics();
  });
}

export async function shutdownObservability(): Promise<void> {
  await shutdownMetrics();
  if (sdk) {
    await sdk.shutdown();
    sdk = undefined;
  }
}