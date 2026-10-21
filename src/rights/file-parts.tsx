import { Alert, Button, UploaderFileRow, formatCount } from "@revelator/pro-ui";

import { downloadSample, readRecords, Unreadable, type ReadResult } from "./files";

/**
 * The parts every upload step shares once a file is READ rather than only named: the file as far
 * as it has got, its row in the uploader, what was read out of it, and the sample files a reviewer
 * can take. Drawn from the system's own parts only.
 */

/** A file chosen, as far as it has got: being read, read into rows, refused with its reason — or a canned stand-in. */
export interface Chosen {
  name: string;
  size?: number;
  read?: ReadResult;
  refused?: string;
  reading?: boolean;
  canned?: boolean;
}

const ROWS = { one: "row", many: "rows" };

/** A file read into rows, its progress said as it goes. Resolves to what was read, or nothing where it was refused. */
export async function choose(file: File, onFile: (file: Chosen | null) => void): Promise<ReadResult | undefined> {
  onFile({ name: file.name, size: file.size, reading: true });
  try {
    const read = await readRecords(file);
    onFile({ name: file.name, size: file.size, read });
    return read;
  } catch (error) {
    onFile({ name: file.name, size: file.size, refused: error instanceof Unreadable ? error.message : `It could not be read: ${(error as Error).message}` });
    return undefined;
  }
}

/** A chosen file as the uploader's row draws it — climbing while it is read, refused with its reason. */
export function ChosenRow({ chosen, onRemove }: { chosen: Chosen; onRemove: () => void }) {
  return (
    <UploaderFileRow
      name={chosen.name}
      fileSize={chosen.size}
      phase={chosen.reading ? "uploading" : chosen.refused ? "error" : "landed"}
      reason={chosen.refused}
      onRemove={onRemove}
    />
  );
}

/** What was read, said under the file: the rows and columns found, and how it was read. */
export function ReadSummary({ chosen, canned }: { chosen: Chosen; canned?: string }) {
  if (chosen.canned && canned)
    return (
      <Alert intent="info" title="The sample file">
        {canned}
      </Alert>
    );
  if (!chosen.read) return null;
  const { read } = chosen;
  return (
    <Alert intent="info" title={`Read as ${read.format}`}>
      {[`${formatCount(read.rows.length, ROWS)}, ${formatCount(read.headers.length, { one: "column", many: "columns" })}.`, ...read.notes].join(" ")}
    </Alert>
  );
}

/** The sample files an upload step offers, each handed over under its own name from `public/samples`. */
export function SampleFiles({ samples }: { samples: readonly { name: string; label: string }[] }) {
  return (
    <>
      {samples.map((one) => (
        <Button key={one.name} variant="inline" onClick={() => void downloadSample(one.name)}>
          {one.label}
        </Button>
      ))}
    </>
  );
}
