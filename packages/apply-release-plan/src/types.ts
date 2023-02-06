import { NewChangeset } from "@abizzle/changesets-types";

export type RelevantChangesets = {
  major: NewChangeset[];
  minor: NewChangeset[];
  patch: NewChangeset[];
};
