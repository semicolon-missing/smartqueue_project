import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";

export default function QrScan({ onScan }) {
  const video = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const scanner = new QrScanner(
      video.current,
      (result) => {
        scanner.stop();
        onScan(result.data);
      },
      { returnDetailedScanResult: true },
    );
    scanner.start().catch(() => setFailed(true));
    return () => scanner.destroy();
  }, [onScan]);

  return (
    <div className="qr-scan">
      <video ref={video} hidden={failed} />
      {failed && <p className="error">Camera unavailable. Type the code instead.</p>}
    </div>
  );
}
