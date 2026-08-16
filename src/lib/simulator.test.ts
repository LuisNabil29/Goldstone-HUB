import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeScorePercent,
  isPassing,
  pickQuestionsForBlueprint,
  scoreAnswer,
  shuffle,
  validateBankCoverage,
  type QuestionWithOptions,
} from "@/lib/simulator";
import type { ExamBlueprint, QuestionType } from "@prisma/client";

function q(
  id: string,
  type: QuestionType,
  options: QuestionWithOptions["options"]
): QuestionWithOptions {
  return {
    id,
    certificationId: "c1",
    elementId: "e1",
    type,
    stem: id,
    explanation: null,
    active: true,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    options,
  };
}

describe("simulator scoring", () => {
  it("scores multiple choice", () => {
    const question = q("1", "MULTIPLE_CHOICE", [
      { id: "a", questionId: "1", label: "A", isCorrect: true, correctOrder: null, sortOrder: 1 },
      { id: "b", questionId: "1", label: "B", isCorrect: false, correctOrder: null, sortOrder: 2 },
    ]);
    assert.equal(scoreAnswer(question, ["a"], []), true);
    assert.equal(scoreAnswer(question, ["b"], []), false);
  });

  it("scores multi select", () => {
    const question = q("2", "MULTI_SELECT", [
      { id: "a", questionId: "2", label: "A", isCorrect: true, correctOrder: null, sortOrder: 1 },
      { id: "b", questionId: "2", label: "B", isCorrect: true, correctOrder: null, sortOrder: 2 },
      { id: "c", questionId: "2", label: "C", isCorrect: false, correctOrder: null, sortOrder: 3 },
    ]);
    assert.equal(scoreAnswer(question, ["a", "b"], []), true);
    assert.equal(scoreAnswer(question, ["a"], []), false);
  });

  it("scores order process", () => {
    const question = q("3", "ORDER_PROCESS", [
      { id: "a", questionId: "3", label: "A", isCorrect: false, correctOrder: 2, sortOrder: 1 },
      { id: "b", questionId: "3", label: "B", isCorrect: false, correctOrder: 1, sortOrder: 2 },
    ]);
    assert.equal(scoreAnswer(question, [], ["b", "a"]), true);
    assert.equal(scoreAnswer(question, [], ["a", "b"]), false);
  });

  it("applies passing threshold at 80", () => {
    assert.equal(computeScorePercent(48, 60), 80);
    assert.equal(isPassing(80, 80), true);
    assert.equal(isPassing(79.9, 80), false);
  });
});

describe("simulator blueprint", () => {
  it("validates coverage", () => {
    const blueprints = [
      { id: "1", certificationId: "c", itemType: "MULTIPLE_CHOICE" as QuestionType, count: 30 },
      { id: "2", certificationId: "c", itemType: "CASE" as QuestionType, count: 15 },
    ] satisfies ExamBlueprint[];
    const ok = validateBankCoverage(blueprints, { MULTIPLE_CHOICE: 30, CASE: 15 });
    assert.equal(ok.ok, true);
    const bad = validateBankCoverage(blueprints, { MULTIPLE_CHOICE: 10, CASE: 15 });
    assert.equal(bad.ok, false);
  });

  it("picks without duplicates and respects counts", () => {
    const questions: QuestionWithOptions[] = [];
    for (let i = 0; i < 30; i += 1) {
      questions.push(
        q(`mc-${i}`, "MULTIPLE_CHOICE", [
          {
            id: `mc-${i}-a`,
            questionId: `mc-${i}`,
            label: "A",
            isCorrect: true,
            correctOrder: null,
            sortOrder: 1,
          },
        ])
      );
    }
    for (let i = 0; i < 15; i += 1) {
      questions.push(
        q(`case-${i}`, "CASE", [
          {
            id: `case-${i}-a`,
            questionId: `case-${i}`,
            label: "A",
            isCorrect: true,
            correctOrder: null,
            sortOrder: 1,
          },
        ])
      );
    }
    const blueprints = [
      { id: "1", certificationId: "c", itemType: "MULTIPLE_CHOICE" as QuestionType, count: 30 },
      { id: "2", certificationId: "c", itemType: "CASE" as QuestionType, count: 15 },
    ];
    let seed = 1;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const selected = pickQuestionsForBlueprint(questions, blueprints, rng);
    assert.equal(selected.length, 45);
    assert.equal(new Set(selected.map((s) => s.id)).size, 45);
    assert.equal(selected.filter((s) => s.type === "MULTIPLE_CHOICE").length, 30);
    assert.equal(selected.filter((s) => s.type === "CASE").length, 15);
  });

  it("shuffles deterministically with fixed rng", () => {
    const items = [1, 2, 3, 4];
    let seed = 42;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const once = shuffle(items, rng);
    assert.equal(once.length, 4);
    assert.deepEqual([...once].sort(), [1, 2, 3, 4]);
  });
});
