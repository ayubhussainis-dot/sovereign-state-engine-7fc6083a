import { BaseEngine } from "../base-engine";
import { scanConfluence } from "../confluence-scanner/scanner";
import type {
  ConfluenceScanOptions,
  ConfluenceScanResult,
  ScannerInputSymbol,
} from "../confluence-scanner/types";

/**
 * Confluence Scanner Engine — runs every structural detector over a
 * batch of symbols and ranks candidates by aggregate confluence score.
 */
export class ConfluenceScannerEngine extends BaseEngine {
  constructor() {
    super("confluence-scanner");
  }

  scan(
    symbols: readonly ScannerInputSymbol[],
    options: ConfluenceScanOptions = {},
  ): ConfluenceScanResult {
    return scanConfluence(symbols, options);
  }

  protected async onHealthCheck() {
    return { pure: true };
  }
}
