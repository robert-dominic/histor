// src/lib/validate-case.ts
import { BOARD_MATERIALS, HOOK_SOUNDS, STAIN_MATERIALS, type AmbienceCue, type AmbienceLayer, type Case } from '@/types/case';
import { isRefId, parseRefs } from '@/lib/parse-refs';

/**
 * Validates a Case object against all structural and referential integrity constraints.
 * Returns an array of error strings describing validation failures.
 * Returns an empty array if the case is valid.
 *
 * @param caseData The Case object to validate
 * @returns Array of error strings, empty if valid
 */
export function validateCase(caseData: Case): string[] {
  const errors: string[] = [];

  // Validate required string fields are non-empty
  if (!caseData.id || caseData.id.trim() === '') {
    errors.push('Field id: Must be a non-empty string');
  }

  if (!caseData.title || caseData.title.trim() === '') {
    errors.push('Field title: Must be a non-empty string');
  }

  if (!caseData.teaser || caseData.teaser.trim() === '') {
    errors.push('Field teaser: Must be a non-empty string');
  }

  // Validate the optional deskGuideIntro: when present, a non-empty string
  if (caseData.deskGuideIntro !== undefined && (typeof caseData.deskGuideIntro !== 'string' || caseData.deskGuideIntro.trim() === '')) {
    errors.push('Field deskGuideIntro: Must be a non-empty string when present');
  }

  if (!caseData.centralQuestion || caseData.centralQuestion.trim() === '') {
    errors.push('Field centralQuestion: Must be a non-empty string');
  }

  // Validate year is a positive integer
  if (!Number.isInteger(caseData.year) || caseData.year <= 0) {
    errors.push('Field year: Must be a positive integer');
  }

  // Validate the optional yearEnd: an integer that is not before year
  if (caseData.yearEnd !== undefined && caseData.yearEnd !== null) {
    if (!Number.isInteger(caseData.yearEnd) || caseData.yearEnd < caseData.year) {
      errors.push('Field yearEnd: Must be an integer not before year');
    }
  }

  // Validate non-empty arrays
  if (!Array.isArray(caseData.theories) || caseData.theories.length === 0) {
    errors.push('Field theories: Must contain at least one theory');
  }

  if (!Array.isArray(caseData.evidence) || caseData.evidence.length === 0) {
    errors.push('Field evidence: Must contain at least one evidence item');
  }

  if (!Array.isArray(caseData.sources) || caseData.sources.length === 0) {
    errors.push('Field sources: Must contain at least one source');
  }

  if (!Array.isArray(caseData.story) || caseData.story.length === 0) {
    errors.push('Field story: Must contain at least one section');
  }

  if (!Array.isArray(caseData.legendIntro?.lines) || caseData.legendIntro.lines.length === 0) {
    errors.push('Field legendIntro.lines: Must contain at least one line');
  }

  if (!Array.isArray(caseData.historiansSummary) || caseData.historiansSummary.length === 0) {
    errors.push('Field historiansSummary: Must contain at least one paragraph');
  }

  // Validate closeThreshold
  const evidenceLength = Array.isArray(caseData.evidence) ? caseData.evidence.length : 0;
  if (
    !Number.isInteger(caseData.closeThreshold) ||
    caseData.closeThreshold < 0 ||
    caseData.closeThreshold > evidenceLength
  ) {
    errors.push(
      `Field closeThreshold: Must be a non-negative integer not exceeding evidence array length (${evidenceLength})`
    );
  }

  // Validate theory ID uniqueness
  if (Array.isArray(caseData.theories)) {
    const theoryIds = new Set<string>();
    for (const theory of caseData.theories) {
      if (theoryIds.has(theory.id)) {
        errors.push(`Field theories: duplicate ID '${theory.id}' found`);
      }
      theoryIds.add(theory.id);
    }
  }

  // Validate evidence ID uniqueness
  if (Array.isArray(caseData.evidence)) {
    const evidenceIds = new Set<string>();
    for (const evidence of caseData.evidence) {
      if (evidenceIds.has(evidence.id)) {
        errors.push(`Field evidence: duplicate ID '${evidence.id}' found`);
      }
      evidenceIds.add(evidence.id);
    }
  }

  // Validate source ID uniqueness and source-level constraints
  if (Array.isArray(caseData.sources)) {
    const sourceIds = new Set<string>();
    const validSourceKinds: string[] = ['testimony', 'official', 'secondary', 'fiction'];

    for (let i = 0; i < caseData.sources.length; i++) {
      const source = caseData.sources[i];

      // Check for duplicate IDs
      if (sourceIds.has(source.id)) {
        errors.push(`Field sources: duplicate ID '${source.id}' found`);
      }
      sourceIds.add(source.id);

      // Validate source id is non-empty string (Task 3.1, Requirement 8.3)
      if (!source.id || source.id.trim() === '') {
        errors.push(`Field sources[${i}].id: Must be a non-empty string`);
      }

      // Validate source title is non-empty string (Task 3.1, Requirement 8.4)
      if (!source.title || source.title.trim() === '') {
        errors.push(`Field sources[${i}].title: Must be a non-empty string`);
      }

      // Validate SourceKind is one of the valid kinds (Task 3.1, Requirement 8.2)
      if (!validSourceKinds.includes(source.kind)) {
        errors.push(
          `Field sources[${i}].kind: Must be one of: testimony, official, secondary, fiction`
        );
      }

      // Validate source has url, citation, or both (Task 3.1, Requirement 8.1)
      const hasUrl = source.url && source.url.trim() !== '';
      const hasCitation = source.citation && source.citation.trim() !== '';
      if (!hasUrl && !hasCitation) {
        errors.push(
          `Field sources[${i}]: Must have either url or citation (or both)`
        );
      }
    }
  }

  // Validate reference ID uniqueness
  if (Array.isArray(caseData.references)) {
    const referenceIds = new Set<string>();
    for (const reference of caseData.references) {
      if (referenceIds.has(reference.id)) {
        errors.push(`Field references: duplicate ID '${reference.id}' found`);
      }
      referenceIds.add(reference.id);
    }
  }

  // ===== Referential Integrity Checks =====

  // Build sets of valid IDs for reference validation
  const validSourceIds = new Set<string>();
  if (Array.isArray(caseData.sources)) {
    for (const source of caseData.sources) {
      validSourceIds.add(source.id);
    }
  }

  const validTheoryIds = new Set<string>();
  if (Array.isArray(caseData.theories)) {
    for (const theory of caseData.theories) {
      validTheoryIds.add(theory.id);
    }
  }

  const validReferenceIds = new Set<string>();
  if (Array.isArray(caseData.references)) {
    for (const reference of caseData.references) {
      validReferenceIds.add(reference.id);
    }
  }

  // Validate Evidence.sources references (7.18)
  if (Array.isArray(caseData.evidence)) {
    for (let i = 0; i < caseData.evidence.length; i++) {
      const evidence = caseData.evidence[i];
      if (Array.isArray(evidence.sources)) {
        for (const sourceId of evidence.sources) {
          if (!validSourceIds.has(sourceId)) {
            errors.push(`Field evidence[${i}].sources: reference ID '${sourceId}' not found in sources`);
          }
        }
      }
    }
  }

  // Validate Evidence-specific constraints (7.18, 10.4)
  if (Array.isArray(caseData.evidence)) {
    for (let i = 0; i < caseData.evidence.length; i++) {
      const evidence = caseData.evidence[i];

      // Check that Evidence.sources is non-empty (NonEmptyArray constraint - 7.18)
      if (!Array.isArray(evidence.sources) || evidence.sources.length === 0) {
        errors.push(`Field evidence[${i}].sources: Must not be empty`);
      }

      // Check legend status specific fields (10.4)
      if (evidence.status === 'legend') {
        const legendEvidence = evidence as { origin?: string };
        if (!legendEvidence.origin || legendEvidence.origin.trim() === '') {
          errors.push(`Field evidence[${i}].origin: Must be a non-empty string`);
        }
      }

      // Check disputed status specific fields (10.4)
      if (evidence.status === 'disputed') {
        const disputedEvidence = evidence as { dispute?: { claim?: string; challenge?: string } };
        if (!disputedEvidence.dispute || !disputedEvidence.dispute.claim || disputedEvidence.dispute.claim.trim() === '') {
          errors.push(`Field evidence[${i}].dispute.claim: Must be a non-empty string`);
        }
        if (!disputedEvidence.dispute || !disputedEvidence.dispute.challenge || disputedEvidence.dispute.challenge.trim() === '') {
          errors.push(`Field evidence[${i}].dispute.challenge: Must be a non-empty string`);
        }
      }

      // Validate reading references
      const reading = evidence.reading;

      if (Array.isArray(reading.supports)) {
        for (const theoryId of reading.supports) {
          if (!validTheoryIds.has(theoryId)) {
            errors.push(`Field evidence[${i}].reading.supports: reference ID '${theoryId}' not found in theories`);
          }
        }
      }

      if (Array.isArray(reading.weakens)) {
        for (const theoryId of reading.weakens) {
          if (!validTheoryIds.has(theoryId)) {
            errors.push(`Field evidence[${i}].reading.weakens: reference ID '${theoryId}' not found in theories`);
          }
        }
      }
    }
  }

  // Validate Reference.sources references (7.19)
  if (Array.isArray(caseData.references)) {
    for (let i = 0; i < caseData.references.length; i++) {
      const reference = caseData.references[i];
      if (Array.isArray(reference.sources)) {
        for (const sourceId of reference.sources) {
          if (!validSourceIds.has(sourceId)) {
            errors.push(`Field references[${i}].sources: reference ID '${sourceId}' not found in sources`);
          }
        }
      }
    }
  }

  // ===== Portal markup checks {{ref:id|label}} (story-engine 4.1 to 4.13) =====

  // Check A: reference id format (4.12)
  if (Array.isArray(caseData.references)) {
    caseData.references.forEach((ref, i) => {
      if (!isRefId(ref.id)) {
        errors.push(`Field references[${i}].id: '${ref.id}' is not a valid reference ID`);
      }
    });
  }

  // Validate the optional legend video (13.5): when present, src, poster and credit must be non-empty
  const legendVideo: { src?: unknown; poster?: unknown; credit?: unknown } | undefined = caseData.theme?.legendVideo;
  if (legendVideo !== undefined && legendVideo !== null) {
    for (const field of ['src', 'poster', 'credit'] as const) {
      const value = legendVideo[field];
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`Field theme.legendVideo.${field}: Must be a non-empty string`);
      }
    }
  }

  // Validate the optional ambience: when present, story and desk are arrays of known layers, each at most once
  const ambience: { story?: unknown; desk?: unknown } | undefined | null = caseData.theme?.ambience;
  if (ambience !== undefined && ambience !== null) {
    for (const place of ['story', 'desk'] as const) {
      const layers = ambience[place];
      if (!Array.isArray(layers)) {
        errors.push(`Field theme.ambience.${place}: Must be an array of ambience layers`);
        continue;
      }
      layers.forEach((layer: unknown, j) => {
        if (typeof layer !== 'string' || !AMBIENCE_LAYERS.includes(layer)) {
          errors.push(`Field theme.ambience.${place}[${j}]: Must be one of ${AMBIENCE_LAYERS.join(', ')}`);
        } else if (layers.indexOf(layer) !== j) {
          errors.push(`Field theme.ambience.${place}[${j}]: '${layer}' is listed twice`);
        }
      });
    }
    // Its cues: each names a story chapter and a sound the sound can make
    const cues: unknown = (ambience as { cues?: unknown }).cues;
    if (cues !== undefined) {
      if (!Array.isArray(cues)) {
        errors.push('Field theme.ambience.cues: Must be an array');
      } else {
        const chapters = new Set(Array.isArray(caseData.story) ? caseData.story.map(section => section?.id) : []);
        cues.forEach((cue: { chapter?: unknown; sound?: unknown } | null, j) => {
          if (typeof cue?.chapter !== 'string' || !chapters.has(cue.chapter)) {
            errors.push(`Field theme.ambience.cues[${j}].chapter: Must be the id of a story chapter`);
          }
          if (typeof cue?.sound !== 'string' || !AMBIENCE_CUES.includes(cue.sound)) {
            errors.push(`Field theme.ambience.cues[${j}].sound: Must be one of ${AMBIENCE_CUES.join(', ')}`);
          }
        });
      }
    }
  }

  // Validate the optional materials (dread pass, 1): an object whose board and stains, when present, are known
  const materials: unknown = caseData.theme?.materials;
  if (materials !== undefined) {
    if (materials === null || typeof materials !== 'object' || Array.isArray(materials)) {
      errors.push('Field theme.materials: Must be an object');
    } else {
      const { board, stains } = materials as Record<string, unknown>;
      if (board !== undefined && !(BOARD_MATERIALS as readonly unknown[]).includes(board)) {
        errors.push(`Field theme.materials.board: Must be one of ${BOARD_MATERIALS.join(', ')}`);
      }
      if (stains !== undefined && !(STAIN_MATERIALS as readonly unknown[]).includes(stains)) {
        errors.push(`Field theme.materials.stains: Must be one of ${STAIN_MATERIALS.join(', ')}`);
      }
    }
  }

  // Validate the optional playlists: when present, story and desk (each optional) are arrays of tracks whose src,
  // title and credit are non-empty strings
  const playlists: unknown = caseData.theme?.playlists;
  if (playlists !== undefined) {
    if (playlists === null || typeof playlists !== 'object' || Array.isArray(playlists)) {
      errors.push('Field theme.playlists: Must be an object with optional story and desk playlists');
    } else {
      for (const place of ['story', 'desk'] as const) {
        const tracks: unknown = (playlists as Record<string, unknown>)[place];
        if (tracks === undefined) {
          continue;
        }
        if (!Array.isArray(tracks)) {
          errors.push(`Field theme.playlists.${place}: Must be an array of tracks`);
          continue;
        }
        tracks.forEach((track: Record<string, unknown> | null, j) => {
          for (const part of ['src', 'title', 'credit'] as const) {
            const value = track === null || typeof track !== 'object' ? undefined : track[part];
            if (typeof value !== 'string' || value.trim() === '') {
              errors.push(`Field theme.playlists.${place}[${j}].${part}: Must be a non-empty string`);
            }
          }
        });
      }
    }
  }

  // Validate the optional chapter image: when present, src, alt and credit must be non-empty
  if (Array.isArray(caseData.story)) {
    caseData.story.forEach((section, i) => {
      const image: { src?: unknown; alt?: unknown; credit?: unknown } | undefined | null = section?.image;
      if (image === undefined || image === null) {
        return;
      }
      for (const field of ['src', 'alt', 'credit'] as const) {
        const value = image[field];
        if (typeof value !== 'string' || value.trim() === '') {
          errors.push(`Field story[${i}].image.${field}: Must be a non-empty string`);
        }
      }
    });
  }

  // Validate the optional roll call (3.14): when present, an array whose every name and role is non-empty
  if (Array.isArray(caseData.story)) {
    caseData.story.forEach((section, i) => {
      const rollCall: unknown = section?.rollCall;
      if (rollCall === undefined || rollCall === null) {
        return;
      }
      if (!Array.isArray(rollCall)) {
        errors.push(`Field story[${i}].rollCall: Must be an array`);
        return;
      }
      rollCall.forEach((entry: { name?: unknown; role?: unknown } | null | undefined, j) => {
        for (const field of ['name', 'role'] as const) {
          const value = entry?.[field];
          if (typeof value !== 'string' || value.trim() === '') {
            errors.push(`Field story[${i}].rollCall[${j}].${field}: Must be a non-empty string`);
          }
        }
      });
    });
  }

  // Validate the optional heading of the roll call's slip (3.19): a non-empty string, on a section with a roll call
  if (Array.isArray(caseData.story)) {
    caseData.story.forEach((section, i) => {
      const title: unknown = section?.rollCallTitle;
      if (title === undefined || title === null) {
        return;
      }
      if (typeof title !== 'string' || title.trim() === '') {
        errors.push(`Field story[${i}].rollCallTitle: Must be a non-empty string`);
      } else if (!Array.isArray(section?.rollCall) || section.rollCall.length === 0) {
        errors.push(`Field story[${i}].rollCallTitle: The section must have a rollCall`);
      }
    });
  }

  // Validate the optional narration of each chapter and of the central question: when present, src and credit
  // must be non-empty strings
  const checkNarration = (narration: { src?: unknown; credit?: unknown } | undefined | null, field: string) => {
    if (narration === undefined) {
      return;
    }
    for (const part of ['src', 'credit'] as const) {
      const value = narration === null || typeof narration !== 'object' ? undefined : narration[part];
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`Field ${field}.${part}: Must be a non-empty string`);
      }
    }
  };
  if (Array.isArray(caseData.story)) {
    caseData.story.forEach((section, i) => checkNarration(section?.narration, `story[${i}].narration`));
  }
  checkNarration(caseData.centralQuestionNarration, 'centralQuestionNarration');

  // Validate the optional eye zones of each chapter (dread pass, 4): boxes in percent that lie inside the image
  if (Array.isArray(caseData.story)) {
    caseData.story.forEach((section, i) => {
      const zones: unknown = section?.eyeZones;
      if (zones === undefined) {
        return;
      }
      if (!Array.isArray(zones)) {
        errors.push(`Field story[${i}].eyeZones: Must be an array`);
        return;
      }
      zones.forEach((zone: unknown, j) => {
        const { x, y, w, h } = (zone ?? {}) as Record<string, unknown>;
        const numbers = [x, y, w, h].every(value => typeof value === 'number' && Number.isFinite(value));
        if (!numbers || (x as number) < 0 || (y as number) < 0 || (w as number) <= 0 || (h as number) <= 0 || (x as number) + (w as number) > 100 || (y as number) + (h as number) > 100) {
          errors.push(`Field story[${i}].eyeZones[${j}]: Must be { x, y, w, h } in percent, inside the image`);
        }
      });
    });
  }

  // Validate the optional dread sound of each hook (review-fixes brief, 7): one of the pool, on a section with a hook
  if (Array.isArray(caseData.story)) {
    caseData.story.forEach((section, i) => {
      const hookSound: unknown = section?.hookSound;
      if (hookSound === undefined) {
        return;
      }
      if (typeof hookSound !== 'string' || !(HOOK_SOUNDS as readonly string[]).includes(hookSound)) {
        errors.push(`Field story[${i}].hookSound: Must be one of ${HOOK_SOUNDS.join(', ')}`);
      } else if (typeof section.hook !== 'string' || section.hook.trim() === '') {
        errors.push(`Field story[${i}].hookSound: The section must have a hook`);
      }
    });
  }

  // Validate the optional weighted parts of the central question (3.17): an array of non-empty phrases, each found
  // word for word in centralQuestion
  const questionEmphasis: unknown = caseData.centralQuestionEmphasis;
  if (questionEmphasis !== undefined && questionEmphasis !== null) {
    if (!Array.isArray(questionEmphasis)) {
      errors.push('Field centralQuestionEmphasis: Must be an array');
    } else {
      questionEmphasis.forEach((phrase: unknown, j) => {
        if (typeof phrase !== 'string' || phrase.trim() === '') {
          errors.push(`Field centralQuestionEmphasis[${j}]: Must be a non-empty string`);
        } else if (typeof caseData.centralQuestion !== 'string' || !caseData.centralQuestion.includes(phrase)) {
          errors.push(`Field centralQuestionEmphasis[${j}]: '${phrase}' must appear word for word in centralQuestion`);
        }
      });
    }
  }

  // Validate the optional lines of the central question (3.18): a non-empty array of trimmed, non-empty strings that,
  // joined with single spaces, give centralQuestion exactly
  const questionLines: unknown = caseData.centralQuestionLines;
  if (questionLines !== undefined && questionLines !== null) {
    if (!Array.isArray(questionLines) || questionLines.length === 0) {
      errors.push('Field centralQuestionLines: Must be a non-empty array');
    } else {
      let linesValid = true;
      questionLines.forEach((line: unknown, j) => {
        if (typeof line !== 'string' || line.trim() === '' || line !== line.trim()) {
          errors.push(`Field centralQuestionLines[${j}]: Must be a non-empty string with no space at either end`);
          linesValid = false;
        }
      });
      if (linesValid && questionLines.join(' ') !== caseData.centralQuestion) {
        errors.push('Field centralQuestionLines: Joined with single spaces, the lines must equal centralQuestion exactly');
      }
    }
  }

  // Validate the optional weighted words (3.16): when present, an array of non-empty phrases, each found word for
  // word in the section's own text (a body paragraph or the hook, with {{ref:…}} markup read as its label)
  if (Array.isArray(caseData.story)) {
    caseData.story.forEach((section, i) => {
      const emphasis: unknown = section?.emphasis;
      if (emphasis === undefined || emphasis === null) {
        return;
      }
      if (!Array.isArray(emphasis)) {
        errors.push(`Field story[${i}].emphasis: Must be an array`);
        return;
      }
      const plain = (text: unknown) =>
        typeof text === 'string'
          ? parseRefs(text)
              .map(segment => (segment.kind === 'text' ? segment.text : segment.label))
              .join('')
          : '';
      const texts = [...(Array.isArray(section.body) ? section.body : []), section.hook].map(plain);
      emphasis.forEach((phrase: unknown, j) => {
        if (typeof phrase !== 'string' || phrase.trim() === '') {
          errors.push(`Field story[${i}].emphasis[${j}]: Must be a non-empty string`);
        } else if (!texts.some(text => text.includes(phrase))) {
          errors.push(`Field story[${i}].emphasis[${j}]: '${phrase}' must appear word for word in the section's body or hook`);
        }
      });
    });
  }

  // Validate the optional voyage (3.15): unique non-empty ids, non-empty labels, latitudes from -90 to 90,
  // longitudes from -180 to 180, a chapter that is in the story, and a known kind
  const voyage: { points?: unknown } | undefined | null = caseData.voyage;
  if (voyage !== undefined && voyage !== null) {
    if (!Array.isArray(voyage.points) || voyage.points.length === 0) {
      errors.push('Field voyage.points: Must contain at least one point');
    } else {
      const chapterIds = new Set(Array.isArray(caseData.story) ? caseData.story.map(section => section?.id) : []);
      const pointIds = new Set<string>();
      voyage.points.forEach((raw: unknown, i) => {
        const point = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
        const at = `voyage.points[${i}]`;
        if (typeof point.id !== 'string' || point.id.trim() === '') {
          errors.push(`Field ${at}.id: Must be a non-empty string`);
        } else if (pointIds.has(point.id)) {
          errors.push(`Field voyage.points: duplicate ID '${point.id}' found`);
        } else {
          pointIds.add(point.id);
        }
        if (typeof point.label !== 'string' || point.label.trim() === '') {
          errors.push(`Field ${at}.label: Must be a non-empty string`);
        }
        if (typeof point.lat !== 'number' || !Number.isFinite(point.lat) || point.lat < -90 || point.lat > 90) {
          errors.push(`Field ${at}.lat: Must be a number from -90 to 90`);
        }
        if (typeof point.lon !== 'number' || !Number.isFinite(point.lon) || point.lon < -180 || point.lon > 180) {
          errors.push(`Field ${at}.lon: Must be a number from -180 to 180`);
        }
        if (typeof point.chapter !== 'string' || !chapterIds.has(point.chapter)) {
          errors.push(`Field ${at}.chapter: reference ID '${String(point.chapter)}' not found in story`);
        }
        if (point.kind !== 'port' && point.kind !== 'record' && point.kind !== 'found') {
          errors.push(`Field ${at}.kind: Must be one of: port, record, found`);
        }
        if (point.unreached !== undefined && typeof point.unreached !== 'boolean') {
          errors.push(`Field ${at}.unreached: Must be a boolean`);
        }
      });
    }
  }

  // Validate the optional image caption, wherever an image can be: when present, it must be non-empty
  const captioned: { location: string; image: { caption?: unknown } | undefined | null }[] = [
    ...(Array.isArray(caseData.story) ? caseData.story : []).map((section, i) => ({
      location: `story[${i}].image`,
      image: section?.image,
    })),
    ...(Array.isArray(caseData.references) ? caseData.references : []).map((reference, i) => ({
      location: `references[${i}].image`,
      image: reference?.image,
    })),
    ...(Array.isArray(caseData.evidence) ? caseData.evidence : []).map((evidence, i) => ({
      location: `evidence[${i}].image`,
      image: evidence?.image,
    })),
  ];
  for (const { location, image } of captioned) {
    const caption = image?.caption;
    if (caption !== undefined && caption !== null && (typeof caption !== 'string' || caption.trim() === '')) {
      errors.push(`Field ${location}.caption: Must be a non-empty string`);
    }
  }

  // Check B: Markup_Fields (4.1 to 4.7, 4.13)
  const fields = markupFields(caseData);
  for (const field of fields) {
    checkMarkupField(field, validReferenceIds, errors);
  }

  // Check C: '{{' in Plain_Fields (4.11)
  const skip = new Set(fields.map(f => f.location));
  collectPlainMarkupErrors(caseData, '', skip, new WeakSet(), errors);

  return errors;
}

interface MarkupField {
  location: string;
  text: string;
}

/** Matches Malformed_Markup of the form {{ref:<Ref_Id>|<empty or whitespace>}} (4.3). */
/** The ambience layers the sound can make (src/lib/sound/ambience.ts). */
const AMBIENCE_LAYERS: readonly string[] = ['sea', 'wind', 'timber', 'room-tone', 'lamp-hum', 'distant-sea'] satisfies readonly AmbienceLayer[];
/** The one-off sounds a chapter can cue. */
const AMBIENCE_CUES: readonly string[] = ['ships-bell'] satisfies readonly AmbienceCue['sound'][];

const EMPTY_LABEL_MARKUP =/^\{\{ref:[a-z0-9]+(?:-[a-z0-9]+)*\|\s*\}\}/;
const ANY_BRACE = /[{}]/;
const EXCERPT_MAX = 40;

/** First `max` code points of s. Never splits a surrogate pair. */
function excerpt(s: string, max = EXCERPT_MAX): string {
  let out = '';
  let n = 0;
  for (const cp of s) {
    if (n++ === max) break;
    out += cp;
  }
  return out;
}

/**
 * Every Markup_Field of the case, in order: story[i].body[j], story[i].hook,
 * evidence[i].detail[j], references[i].profile[j]. Only string values are returned.
 */
function markupFields(c: Case): MarkupField[] {
  const out: MarkupField[] = [];

  if (Array.isArray(c.story)) {
    c.story.forEach((section, i) => {
      if (Array.isArray(section?.body)) {
        section.body.forEach((text, j) => {
          if (typeof text === 'string') out.push({ location: `story[${i}].body[${j}]`, text });
        });
      }
      if (typeof section?.hook === 'string') {
        out.push({ location: `story[${i}].hook`, text: section.hook });
      }
    });
  }

  if (Array.isArray(c.evidence)) {
    c.evidence.forEach((ev, i) => {
      if (Array.isArray(ev?.detail)) {
        ev.detail.forEach((text, j) => {
          if (typeof text === 'string') out.push({ location: `evidence[${i}].detail[${j}]`, text });
        });
      }
    });
  }

  if (Array.isArray(c.references)) {
    c.references.forEach((ref, i) => {
      if (Array.isArray(ref?.profile)) {
        ref.profile.forEach((text, j) => {
          if (typeof text === 'string') out.push({ location: `references[${i}].profile[${j}]`, text });
        });
      }
    });
  }

  return out;
}

/** Parses one Markup_Field and reports unknown ids, Malformed_Markup and stray braces. */
function checkMarkupField(field: MarkupField, knownIds: Set<string>, errors: string[]): void {
  const { location, text: fieldText } = field;
  let offset = 0;

  for (const seg of parseRefs(fieldText)) {
    if (seg.kind === 'ref') {
      if (!knownIds.has(seg.id)) {
        errors.push(`Field ${location}: reference ID '${seg.id}' not found in references`);
      }
      offset += seg.raw.length;
      continue;
    }

    const t = seg.text;
    let hasDoubleBrace = false;
    for (let p = 0; p < t.length - 1; p++) {
      if (t[p] !== '{' || t[p + 1] !== '{') continue;
      hasDoubleBrace = true;
      const rest = fieldText.slice(offset + p);
      if (EMPTY_LABEL_MARKUP.test(rest)) {
        errors.push(`Field ${location}: Invalid reference markup - label cannot be empty`);
      } else {
        errors.push(`Field ${location}: Invalid reference markup near '${excerpt(rest)}'`);
      }
    }

    if (!hasDoubleBrace) {
      const b = t.search(ANY_BRACE);
      if (b !== -1) {
        errors.push(`Field ${location}: Stray brace near '${excerpt(fieldText.slice(offset + b))}'`);
      }
    }

    offset += t.length;
  }
}

/**
 * Walks every string in the case and reports '{{' in any Plain_Field (4.11).
 * Markup_Field locations in `skip` are not checked here.
 */
function collectPlainMarkupErrors(
  value: unknown,
  path: string,
  skip: Set<string>,
  seen: WeakSet<object>,
  errors: string[]
): void {
  if (typeof value === 'string') {
    if (!skip.has(path) && value.includes('{{')) {
      errors.push(`Field ${path}: portal markup is not allowed in this field`);
    }
    return;
  }
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, i) => collectPlainMarkupErrors(item, `${path}[${i}]`, skip, seen, errors));
    return;
  }

  for (const key of Object.keys(value)) {
    const childPath = path === '' ? key : `${path}.${key}`;
    collectPlainMarkupErrors((value as Record<string, unknown>)[key], childPath, skip, seen, errors);
  }
}
