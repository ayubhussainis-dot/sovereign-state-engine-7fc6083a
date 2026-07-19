import { BaseEngine } from "../base-engine";
import {
  analyzeICTMacros,
  ictMacro,
  ICT_MACROS,
} from "../ict-macro/analyzer";
import type {
  ICTMacroAnalysis,
  ICTMacroId,
  ICTMacroOptions,
  ICTMacroWindow,
  OHLCBar,
} from "../ict-macro/types";

/**
 * ICT Macro Engine — identifies narrow intraday windows where price is
 * expected to reach for liquidity or rebalance imbalances. Pure.
 */
export class ICTMacroEngine extends BaseEngine {
  constructor() {
    super("ict-macro");
  }

  analyze(bars: readonly OHLCBar[], options: ICTMacroOptions = {}): ICTMacroAnalysis {
    return analyzeICTMacros(bars, options);
  }

  macros(): readonly ICTMacroWindow[] {
    return ICT_MACROS;
  }

  macro(id: ICTMacroId): ICTMacroWindow | undefined {
    return ictMacro(id);
  }

  protected async onHealthCheck() {
    return { macros: ICT_MACROS.length };
  }
}
