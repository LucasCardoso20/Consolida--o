import type { Visitor } from "../types/visitor";

const STORAGE_KEY = "consolidacao_visitors";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getVisitors(): Visitor[] {
  if (!isBrowser()) {
    return [];
  }

  const savedVisitors = window.localStorage.getItem(STORAGE_KEY);

  if (!savedVisitors) {
    return [];
  }

  try {
    const visitors = JSON.parse(savedVisitors) as Visitor[];

    return visitors.sort(
      (firstVisitor, secondVisitor) =>
        new Date(secondVisitor.createdAt).getTime() -
        new Date(firstVisitor.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

export function getVisitorById(visitorId: string): Visitor | null {
  return getVisitors().find((visitor) => visitor.id === visitorId) ?? null;
}

export function saveVisitor(visitor: Visitor) {
  const visitors = getVisitors();

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([visitor, ...visitors]),
  );
}

export function updateVisitor(updatedVisitor: Visitor) {
  const visitors = getVisitors();

  const updatedVisitors = visitors.map((visitor) =>
    visitor.id === updatedVisitor.id ? updatedVisitor : visitor,
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVisitors));
}