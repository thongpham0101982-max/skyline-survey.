import { IDigitalSignatureProvider } from "./provider-interface";
import { DigitalSignatureProviderCode } from "./types";
import { MockSandboxSignatureProvider } from "./providers/mock-provider";
import { VnptSmartCaProvider } from "./providers/vnpt-smartca-provider";
import {
  ViettelCaProvider,
  MisaESignProvider,
  FptCaProvider,
} from "./providers/commercial-providers";

export class DigitalSignatureProviderFactory {
  private static providers: Map<DigitalSignatureProviderCode, IDigitalSignatureProvider> = new Map();

  static getProvider(code: DigitalSignatureProviderCode): IDigitalSignatureProvider {
    if (this.providers.has(code)) {
      return this.providers.get(code)!;
    }

    let instance: IDigitalSignatureProvider;
    switch (code) {
      case "VNPT_SMARTCA":
        instance = new VnptSmartCaProvider();
        break;
      case "VIETTEL_CA":
        instance = new ViettelCaProvider();
        break;
      case "MISA_ESIGN":
        instance = new MisaESignProvider();
        break;
      case "FPT_CA":
        instance = new FptCaProvider();
        break;
      case "MOCK_SANDBOX":
      default:
        instance = new MockSandboxSignatureProvider();
        break;
    }

    this.providers.set(code, instance);
    return instance;
  }
}
