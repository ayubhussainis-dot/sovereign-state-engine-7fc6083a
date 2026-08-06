import type { JOALLInternalState } from "./types";
import type { MirrorFrame } from "../twin/not-mirror";

export class JOALLTranslator {
  private previousCoordinate = 0;
  private initialized = false;

  public translate(frame: MirrorFrame): JOALLInternalState {
    const coordinate = frame.lastPrice;

    if (!this.initialized) {
      this.previousCoordinate = coordinate;
      this.initialized = true;
    }

    const velocity = coordinate - this.previousCoordinate;
    this.previousCoordinate = coordinate;

    const pressure = Math.abs(frame.bid - frame.ask);

    const stability =
      1 / (1 + Math.abs(velocity));

    return {
      coordinate,
      velocity,
      pressure,
      stability,
      timestamp: frame.lastEventTs || Date.now(),
    };
  }
}
