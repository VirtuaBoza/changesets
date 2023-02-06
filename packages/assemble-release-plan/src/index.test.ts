import { defaultConfig } from "@abizzle/changesets-config";
import assembleReleasePlan from "./";
import FakeFullState from "./test-utils";

describe("assemble-release-plan", () => {
  let setup: FakeFullState;

  beforeEach(() => {
    setup = new FakeFullState();

    setup.addPackage("pkg-b", "1.0.0");
    setup.addPackage("pkg-c", "1.0.0");
    setup.addPackage("pkg-d", "1.0.0");
  });

  it("should assemble release plan for basic setup", () => {
    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(1);
    expect(individualReleases[0]).toEqual({
      name: "pkg-a",
      type: "patch",
      newVersion: "1.0.1",
      oldVersion: "1.0.0",
      changesets: ["strange-words-combine"],
    });
  });

  it("should assemble release plan for basic setup with snapshot", () => {
    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined,
      {
        tag: undefined,
      }
    );

    expect(individualReleases.length).toBe(1);
    expect(
      /0\.0\.0-\d{14}/.test(individualReleases[0].newVersion)
    ).toBeTruthy();
  });

  it("should assemble release plan for basic setup with snapshot and tag", () => {
    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined,
      {
        tag: "foo",
      }
    );

    expect(individualReleases.length).toBe(1);
    expect(
      /0\.0\.0-foo-\d{14}/.test(individualReleases[0].newVersion)
    ).toBeTruthy();
  });

  it("should assemble release plan with multiple packages", () => {
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [
        { name: "pkg-b", type: "patch" },
        { name: "pkg-c", type: "patch" },
        { name: "pkg-d", type: "major" },
      ],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(4);
    expect(individualReleases[0].name).toBe("pkg-a");
    expect(individualReleases[0].newVersion).toBe("1.0.1");
    expect(individualReleases[1].name).toBe("pkg-b");
    expect(individualReleases[1].newVersion).toBe("1.0.1");
    expect(individualReleases[2].name).toBe("pkg-c");
    expect(individualReleases[2].newVersion).toBe("1.0.1");
    expect(individualReleases[3].name).toBe("pkg-d");
    expect(individualReleases[3].newVersion).toBe("2.0.0");
  });
  it("should handle two changesets for a package", () => {
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-a", type: "major" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(1);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].type).toEqual("major");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
  });
  it("`none` changeset should not override other release types", () => {
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [
        { name: "pkg-a", type: "none" },
        { name: "pkg-b", type: "none" },
        { name: "pkg-c", type: "none" },
      ],
    });
    setup.addChangeset({
      id: "big-cats-wonder",
      releases: [
        { name: "pkg-a", type: "patch" },
        { name: "pkg-b", type: "minor" },
        { name: "pkg-c", type: "major" },
      ],
    });
    setup.addChangeset({
      id: "big-cats-yelp",
      releases: [
        { name: "pkg-a", type: "none" },
        { name: "pkg-b", type: "none" },
        { name: "pkg-c", type: "none" },
      ],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(3);

    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].type).toEqual("patch");
    expect(individualReleases[0].newVersion).toEqual("1.0.1");

    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].type).toEqual("minor");
    expect(individualReleases[1].newVersion).toEqual("1.1.0");

    expect(individualReleases[2].name).toEqual("pkg-c");
    expect(individualReleases[2].type).toEqual("major");
    expect(individualReleases[2].newVersion).toEqual("2.0.0");
  });
  it("should assemble release plan with dependents", () => {
    setup.updateDependency("pkg-b", "pkg-a", "^1.0.0");
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-a", type: "major" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("1.0.1");
    expect(individualReleases[1].changesets).toEqual([]);
  });
  it("should update multiple dependents of a single package", () => {
    setup.updateDependency("pkg-b", "pkg-a", "1.0.0");
    setup.updateDependency("pkg-c", "pkg-a", "1.0.0");

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(3);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.0.1");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("1.0.1");
    expect(individualReleases[2].name).toEqual("pkg-c");
    expect(individualReleases[2].newVersion).toEqual("1.0.1");
  });
  it("should update a second dependent based on updating a first dependent", () => {
    setup.updateDependency("pkg-b", "pkg-a", "1.0.0");
    setup.updateDependency("pkg-c", "pkg-b", "1.0.0");

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(3);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.0.1");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("1.0.1");
    expect(individualReleases[2].name).toEqual("pkg-c");
    expect(individualReleases[2].newVersion).toEqual("1.0.1");
  });
  it("should assemble release plan with without a wildcard dependent", () => {
    setup.updateDependency("pkg-b", "pkg-a", "*");
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-a", type: "major" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(1);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
  });

  it("should assemble the release plan only with workspace protocol dependents when using bumpVersionsWithWorkspaceProtocolOnly", () => {
    setup.updateDependency("pkg-b", "pkg-a", "^1.0.0");
    setup.updateDependency("pkg-c", "pkg-a", "workspace:^1.0.0");
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-a", type: "major" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      {
        ...defaultConfig,
        bumpVersionsWithWorkspaceProtocolOnly: true,
      },
      undefined
    );

    expect(individualReleases.length).toEqual(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
    expect(individualReleases[1].name).toEqual("pkg-c");
    expect(individualReleases[1].newVersion).toEqual("1.0.1");
    expect(individualReleases[1].changesets).toEqual([]);
  });
  it("should assemble the release plan with workspace:^ and workspace:~ dependents", () => {
    setup.updateDependency("pkg-b", "pkg-a", "workspace:~");
    setup.updateDependency("pkg-c", "pkg-a", "workspace:^");
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-a", type: "major" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      {
        ...defaultConfig,
        bumpVersionsWithWorkspaceProtocolOnly: true,
      },
      undefined
    );

    expect(individualReleases.length).toEqual(3);

    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");

    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("1.0.1");
    expect(individualReleases[1].changesets).toEqual([]);

    expect(individualReleases[2].name).toEqual("pkg-c");
    expect(individualReleases[2].newVersion).toEqual("1.0.1");
    expect(individualReleases[2].changesets).toEqual([]);
  });
  it("should assemble release plan without dependent through dev dependency", () => {
    setup.updateDevDependency("pkg-b", "pkg-a", "^1.0.0");
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-a", type: "major" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("1.0.0");
  });
  it("should assemble release plan with dependent when the dependent has both a changed prod and dev dependency", () => {
    setup.updateDevDependency("pkg-b", "pkg-a", "^1.0.0");
    setup.updateDependency("pkg-b", "pkg-c", "^1.0.0");
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [
        { name: "pkg-a", type: "major" },
        { name: "pkg-c", type: "major" },
      ],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(3);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
    expect(individualReleases[1].name).toEqual("pkg-c");
    expect(individualReleases[1].newVersion).toEqual("2.0.0");
    expect(individualReleases[2].name).toEqual("pkg-b");
    expect(individualReleases[2].oldVersion).toEqual("1.0.0");
    expect(individualReleases[2].newVersion).toEqual("1.0.1");
  });
  it("should assemble release plan without dependencies when the dependent has a changeset type of none", () => {
    setup.updateDependency("pkg-c", "pkg-b", "^1.0.0");
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-b", type: "none" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].oldVersion).toEqual("1.0.0");
    expect(individualReleases[1].newVersion).toEqual("1.0.0");
  });
  it("should assemble release plan without dependent through the link protocol", () => {
    setup.updateDevDependency("pkg-b", "pkg-a", "link:../pkg-a");
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-a", type: "major" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(1);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
  });
  it("should assemble release plan without dependent through the file protocol", () => {
    setup.updateDevDependency("pkg-b", "pkg-a", "file:../pkg-a");
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-a", type: "major" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(1);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
  });
  it("should update a peerDep by a major bump", () => {
    setup.updatePeerDependency("pkg-b", "pkg-a", "~1.0.0");
    setup.addChangeset({
      id: "nonsense-words-combine",
      releases: [{ name: "pkg-a", type: "minor" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.1.0");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("2.0.0");
  });
  it("should assemble release plan without ignored packages", () => {
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-a", type: "major" }],
    });
    setup.addChangeset({
      id: "small-dogs-sad",
      releases: [{ name: "pkg-b", type: "minor" }],
    });
    const { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      {
        ...defaultConfig,
        ignore: ["pkg-b"],
      },
      undefined
    );

    expect(individualReleases.length).toEqual(1);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
  });
  it("should generate individualReleases with 'none' release type for ignored packages through dependencies", () => {
    setup.updateDependency("pkg-b", "pkg-a", "1.0.0");
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-a", type: "major" }],
    });
    setup.addChangeset({
      id: "small-dogs-sad",
      releases: [{ name: "pkg-b", type: "minor" }],
    });
    const { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      {
        ...defaultConfig,
        ignore: ["pkg-b"],
      },
      undefined
    );

    expect(individualReleases.length).toEqual(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].type).toEqual("none");
    expect(individualReleases[1].newVersion).toEqual("1.0.0");
  });
  it("should generate individualReleases with 'none' release type for ignored packages through peerDependencies", () => {
    setup.updatePeerDependency("pkg-b", "pkg-a", "1.0.0");
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-a", type: "major" }],
    });
    setup.addChangeset({
      id: "small-dogs-sad",
      releases: [{ name: "pkg-b", type: "minor" }],
    });
    const { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      {
        ...defaultConfig,
        ignore: ["pkg-b"],
      },
      undefined
    );

    expect(individualReleases.length).toEqual(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].type).toEqual("none");
    expect(individualReleases[1].newVersion).toEqual("1.0.0");
  });
  it("should generate individualReleases with 'none' release type for ignored packages through devDependencies", () => {
    setup.updateDevDependency("pkg-b", "pkg-a", "1.0.0");
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [{ name: "pkg-a", type: "major" }],
    });
    setup.addChangeset({
      id: "small-dogs-sad",
      releases: [{ name: "pkg-b", type: "minor" }],
    });
    const { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      {
        ...defaultConfig,
        ignore: ["pkg-b"],
      },
      undefined
    );

    expect(individualReleases.length).toEqual(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].type).toEqual("none");
    expect(individualReleases[1].newVersion).toEqual("1.0.0");
  });
  // Mixed changesets are the ones that contains both ignored packages and not ignored packages
  it("should throw for mixed changesets", () => {
    setup.addChangeset({
      id: "big-cats-delight",
      releases: [
        { name: "pkg-a", type: "major" },
        { name: "pkg-b", type: "minor" },
      ],
    });

    expect(() =>
      assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          ignore: ["pkg-b"],
        },
        undefined
      )
    ).toThrowErrorMatchingInlineSnapshot(`
"Found mixed changeset big-cats-delight
Found ignored packages: pkg-b
Found not ignored packages: pkg-a
Mixed changesets that contain both ignored and not ignored packages are not allowed"
`);
  });

  it("should not bump a dev dependent nor its dependent when a package gets bumped", () => {
    setup.updateDevDependency("pkg-b", "pkg-a", "1.0.0");
    setup.updateDependency("pkg-c", "pkg-b", "1.0.0");

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.0.1");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("1.0.0");
  });

  describe("fixed packages", () => {
    it("should assemble release plan for fixed packages", () => {
      setup.addChangeset({
        id: "just-some-umbrellas",
        releases: [{ name: "pkg-a", type: "minor" }],
      });

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          fixed: [["pkg-a", "pkg-b"]],
        },
        undefined
      );

      expect(individualReleases.length).toEqual(2);
      expect(individualReleases[0].newVersion).toEqual("1.1.0");
      expect(individualReleases[1].newVersion).toEqual("1.1.0");
    });
    it("should assemble a release plan where new highest version is set by an unreleased package", () => {
      setup.addChangeset({
        id: "just-some-umbrellas",
        releases: [
          { name: "pkg-b", type: "minor" },
          { name: "pkg-a", type: "patch" },
        ],
      });

      setup.updatePackage("pkg-c", "2.0.0");

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          fixed: [["pkg-a", "pkg-b", "pkg-c"]],
        },
        undefined
      );

      expect(individualReleases.length).toEqual(3);
      expect(individualReleases[0].newVersion).toEqual("2.1.0");
      expect(individualReleases[1].newVersion).toEqual("2.1.0");
      expect(individualReleases[2].newVersion).toEqual("2.1.0");
    });

    it("should assemble release plan where a fixed constraint causes a dependency to need changing which causes a second fixed group to update", () => {
      // Expected events:
      // - dependencies are checked, nothing leaves semver, nothing changes
      // - fixed are checked, pkg-a is aligned with pkg-b
      // - depencencies are checked, in pkg-c the dependency range for pkg-a is not satisfied, so a patch bump is given to it
      // - fixed are checked, pkg-c is aligned with pkg-d
      setup.addChangeset({
        id: "just-some-umbrellas",
        releases: [{ name: "pkg-b", type: "major" }],
      });
      setup.addChangeset({
        id: "totally-average-verbiage",
        releases: [{ name: "pkg-d", type: "minor" }],
      });

      setup.updateDependency("pkg-c", "pkg-a", "^1.0.0");

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          fixed: [
            ["pkg-a", "pkg-b"],
            ["pkg-c", "pkg-d"],
          ],
        },
        undefined
      );

      expect(individualReleases.length).toEqual(4);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[0].newVersion).toEqual("2.0.0");
      expect(individualReleases[1].name).toEqual("pkg-b");
      expect(individualReleases[1].newVersion).toEqual("2.0.0");
      expect(individualReleases[2].name).toEqual("pkg-d");
      expect(individualReleases[2].newVersion).toEqual("1.1.0");
      expect(individualReleases[3].name).toEqual("pkg-c");
      expect(individualReleases[3].newVersion).toEqual("1.1.0");
    });
    it("should assemble release plan where a fixed constraint causes a dependency to need changing which causes a second fixed group to update 2", () => {
      setup.addChangeset({
        id: "just-some-umbrellas",
        releases: [{ name: "pkg-a", type: "major" }],
      });
      setup.addChangeset({
        id: "totally-average-verbiage",
        releases: [{ name: "pkg-d", type: "minor" }],
      });

      setup.updateDependency("pkg-c", "pkg-b", "^1.0.0");

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          fixed: [
            ["pkg-a", "pkg-b"],
            ["pkg-c", "pkg-d"],
          ],
        },
        undefined
      );

      expect(individualReleases.length).toEqual(4);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[0].newVersion).toEqual("2.0.0");
      expect(individualReleases[1].name).toEqual("pkg-d");
      expect(individualReleases[1].newVersion).toEqual("1.1.0");
      expect(individualReleases[2].name).toEqual("pkg-b");
      expect(individualReleases[2].newVersion).toEqual("2.0.0");
      expect(individualReleases[3].name).toEqual("pkg-c");
      expect(individualReleases[3].newVersion).toEqual("1.1.0");
    });
    it("should return an empty release array when no changes will occur", () => {
      let { individualReleases } = assembleReleasePlan(
        [],
        setup.packages,
        {
          ...defaultConfig,
          fixed: [
            ["pkg-a", "pkg-b"],
            ["pkg-c", "pkg-d"],
          ],
        },
        undefined
      );

      expect(individualReleases).toEqual([]);
    });

    it("should bump peer dependents where the version is updated because of fixed", () => {
      setup.updatePeerDependency("pkg-b", "pkg-c", "1.0.0");

      setup.addChangeset({
        id: "some-id",
        releases: [{ type: "minor", name: "pkg-a" }],
      });

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          fixed: [["pkg-a", "pkg-c"]],
        },
        undefined
      );

      expect(individualReleases).toMatchObject([
        {
          name: "pkg-a",
          newVersion: "1.1.0",
        },
        {
          name: "pkg-c",
          newVersion: "1.1.0",
        },
        {
          name: "pkg-b",
          newVersion: "2.0.0",
        },
      ]);
    });
  });

  describe("linked packages", () => {
    it("should assemble release plan for linked packages", () => {
      setup.addChangeset({
        id: "just-some-umbrellas",
        releases: [{ name: "pkg-b", type: "major" }],
      });

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          linked: [["pkg-a", "pkg-b"]],
        },
        undefined
      );

      expect(individualReleases.length).toEqual(2);
      expect(individualReleases[0].newVersion).toEqual("2.0.0");
      expect(individualReleases[1].newVersion).toEqual("2.0.0");
    });
    it("should assemble a release plan where new highest version is set by an unreleased package", () => {
      setup.addChangeset({
        id: "just-some-umbrellas",
        releases: [
          { name: "pkg-b", type: "minor" },
          { name: "pkg-a", type: "patch" },
        ],
      });

      setup.updatePackage("pkg-c", "2.0.0");

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          linked: [["pkg-a", "pkg-b", "pkg-c"]],
        },
        undefined
      );

      expect(individualReleases.length).toEqual(2);
      expect(individualReleases[0].newVersion).toEqual("2.1.0");
      expect(individualReleases[1].newVersion).toEqual("2.1.0");
    });
    it("should assemble release plan where a link causes a dependency to need changing which causes a second link to update", () => {
      /*
      Expected events:
      - dependencies are checked, nothing leaves semver, nothing changes
      - linked are checked, pkg-a is aligned with pkg-b
      - dependencies are checked, pkg-c is now outside its dependency on pkg-a, and is given a patch
      - linked is checked, pkg-c is aligned with pkg-d
    */
      setup.addChangeset({
        id: "just-some-umbrellas",
        releases: [{ name: "pkg-b", type: "major" }],
      });
      setup.addChangeset({
        id: "totally-average-verbiage",
        releases: [{ name: "pkg-d", type: "minor" }],
      });

      setup.updateDependency("pkg-c", "pkg-a", "^1.0.0");

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          linked: [
            ["pkg-a", "pkg-b"],
            ["pkg-c", "pkg-d"],
          ],
        },
        undefined
      );

      expect(individualReleases.length).toEqual(4);
      expect(individualReleases[0].newVersion).toEqual("2.0.0");
      expect(individualReleases[1].newVersion).toEqual("2.0.0");
      expect(individualReleases[2].newVersion).toEqual("1.1.0");
      expect(individualReleases[3].newVersion).toEqual("1.1.0");
    });
    it("should return an empty release array when no changes will occur", () => {
      let { individualReleases } = assembleReleasePlan(
        [],
        setup.packages,
        {
          ...defaultConfig,
          linked: [
            ["pkg-a", "pkg-b"],
            ["pkg-c", "pkg-d"],
          ],
        },
        undefined
      );

      expect(individualReleases).toEqual([]);
    });
    it("should bump peer dependents where the version is updated because of linked", () => {
      setup.updatePeerDependency("pkg-b", "pkg-a", "1.0.0");

      setup.addChangeset({
        id: "some-id",
        releases: [{ type: "minor", name: "pkg-c" }],
      });

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          linked: [["pkg-a", "pkg-c"]],
        },
        undefined
      );

      expect(individualReleases).toMatchObject([
        {
          name: "pkg-a",
          newVersion: "1.1.0",
        },
        {
          name: "pkg-c",
          newVersion: "1.1.0",
        },
        {
          name: "pkg-b",
          newVersion: "2.0.0",
        },
      ]);
    });
  });

  describe("pre mode", () => {
    it("should not generate a release for package that has no changesets and is not a dependent of any packages being released when exiting pre mode", () => {
      const { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
        },
        {
          changesets: [],
          tag: "next",
          initialVersions: {},
          mode: "exit",
        }
      );

      expect(individualReleases.length).toEqual(1);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[0].newVersion).toEqual("1.0.1");
    });

    it("should bump dev dependents when exiting pre-release mode", () => {
      setup.updatePackage("pkg-a", "1.0.1-next.0");
      setup.updatePackage("pkg-b", "1.0.1-next.0");
      setup.updateDevDependency("pkg-b", "pkg-a", "1.0.1-next.0");

      const { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
        },
        {
          changesets: ["strange-words-combine"],
          tag: "next",
          initialVersions: {
            "pkg-a": "1.0.0",
            "pkg-b": "1.0.0",
          },
          mode: "exit",
        }
      );

      expect(individualReleases.length).toEqual(2);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[0].newVersion).toEqual("1.0.1");
      expect(individualReleases[1].name).toEqual("pkg-b");
      expect(individualReleases[1].newVersion).toEqual("1.0.1");
    });

    it("should not bump ignored dev dependents when exiting pre-release mode", () => {
      setup.updatePackage("pkg-a", "1.0.1-next.0");
      setup.updatePackage("pkg-b", "1.0.1-next.0");
      setup.updateDevDependency("pkg-b", "pkg-a", "1.0.1-next.0");

      const { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          ignore: ["pkg-b"],
        },
        {
          changesets: ["strange-words-combine"],
          tag: "next",
          initialVersions: {
            "pkg-a": "1.0.0",
            "pkg-b": "1.0.0",
          },
          mode: "exit",
        }
      );

      expect(individualReleases.length).toEqual(2);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[0].newVersion).toEqual("1.0.1");
      expect(individualReleases[1].name).toEqual("pkg-b");
      expect(individualReleases[1].newVersion).toEqual("1.0.1-next.0");
    });

    it("should return a release with the highest bump type within the current release despite of having a higher release among previous prereleases", () => {
      // previous release
      setup.addChangeset({
        id: "major-bumping-one",
        releases: [
          {
            name: "pkg-a",
            type: "major",
          },
        ],
      });
      setup.updatePackage("pkg-a", "2.0.0-next.0");

      // current release
      setup.addChangeset({
        id: "minor-bumping-one",
        releases: [
          {
            name: "pkg-a",
            type: "minor",
          },
        ],
      });
      const { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
        },
        {
          changesets: ["major-bumping-one"],
          tag: "next",
          initialVersions: {
            "pkg-a": "1.0.0",
            "pkg-b": "1.0.0",
            "pkg-c": "1.0.0",
          },
          mode: "pre",
        }
      );

      expect(individualReleases.length).toEqual(1);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[0].newVersion).toEqual("2.0.0-next.1");
      expect(individualReleases[0].type).toEqual("minor");
    });
  });

  describe("workspace protocol", () => {
    it("should assemble release plan without workspace dependencies when the dependent has a changeset type of none", () => {
      setup.updateDependency("pkg-c", "pkg-b", "workspace:^1.0.0");
      setup.addChangeset({
        id: "big-cats-delight",
        releases: [{ name: "pkg-b", type: "none" }],
      });

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        defaultConfig,
        undefined
      );

      expect(individualReleases.length).toEqual(2);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[1].name).toEqual("pkg-b");
      expect(individualReleases[1].oldVersion).toEqual("1.0.0");
      expect(individualReleases[1].newVersion).toEqual("1.0.0");
    });
    it("should assemble release plan without workspace:* dependencies when the dependent has a changeset type of none", () => {
      setup.updateDependency("pkg-c", "pkg-b", "workspace:*");
      setup.addChangeset({
        id: "big-cats-delight",
        releases: [{ name: "pkg-b", type: "none" }],
      });

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        defaultConfig,
        undefined
      );

      expect(individualReleases.length).toEqual(2);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[1].name).toEqual("pkg-b");
      expect(individualReleases[1].oldVersion).toEqual("1.0.0");
      expect(individualReleases[1].newVersion).toEqual("1.0.0");
    });
    it("should assemble release plan with workspace:* dependencies", () => {
      setup.updateDependency("pkg-b", "pkg-a", "workspace:*");

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        defaultConfig,
        undefined
      );

      expect(individualReleases.length).toEqual(2);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[1].name).toEqual("pkg-b");
      expect(individualReleases[1].oldVersion).toEqual("1.0.0");
      expect(individualReleases[1].newVersion).toEqual("1.0.1");
    });
  });

  describe("updateInternalDependents: always", () => {
    it("should bump a direct dependent when a dependency package gets bumped", () => {
      setup.updateDependency("pkg-b", "pkg-a", "^1.0.0");

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          ___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH: {
            ...defaultConfig.___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH,
            updateInternalDependents: "always",
          },
        },
        undefined
      );

      expect(individualReleases.length).toBe(2);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[0].newVersion).toEqual("1.0.1");
      expect(individualReleases[1].name).toEqual("pkg-b");
      expect(individualReleases[1].newVersion).toEqual("1.0.1");
    });

    it("should bump a transitive dependent when a dependency package gets bumped", () => {
      setup.updateDependency("pkg-b", "pkg-a", "^1.0.0");
      setup.updateDependency("pkg-c", "pkg-b", "^1.0.0");

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          ___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH: {
            ...defaultConfig.___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH,
            updateInternalDependents: "always",
          },
        },
        undefined
      );

      expect(individualReleases.length).toBe(3);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[0].newVersion).toEqual("1.0.1");
      expect(individualReleases[1].name).toEqual("pkg-b");
      expect(individualReleases[1].newVersion).toEqual("1.0.1");
      expect(individualReleases[2].name).toEqual("pkg-c");
      expect(individualReleases[2].newVersion).toEqual("1.0.1");
    });

    it("not bump a dependent package when a dependency has `none` changeset", () => {
      setup.updateDependency("pkg-b", "pkg-c", "^1.0.0");
      setup.addChangeset({
        id: "stuff-and-nonsense",
        releases: [{ name: "pkg-c", type: "none" }],
      });

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          ___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH: {
            ...defaultConfig.___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH,
            updateInternalDependents: "always",
          },
        },
        undefined
      );

      expect(individualReleases.length).toBe(2);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[0].newVersion).toEqual("1.0.1");
      expect(individualReleases[1].name).toEqual("pkg-c");
      expect(individualReleases[1].newVersion).toEqual("1.0.0");
    });

    it("should not bump a dev dependent nor its dependent when a package gets bumped", () => {
      setup.updateDevDependency("pkg-b", "pkg-a", "^1.0.0");
      setup.updateDependency("pkg-c", "pkg-b", "^1.0.0");

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          ___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH: {
            ...defaultConfig.___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH,
            updateInternalDependents: "always",
          },
        },
        undefined
      );

      expect(individualReleases.length).toBe(2);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[0].newVersion).toEqual("1.0.1");
      expect(individualReleases[1].name).toEqual("pkg-b");
      expect(individualReleases[1].newVersion).toEqual("1.0.0");
    });
  });
});

describe("version update thoroughness", () => {
  let setup: FakeFullState;
  beforeEach(() => {
    setup = new FakeFullState();

    setup.addPackage("pkg-b", "1.0.0");
    setup.addPackage("pkg-c", "1.0.0");
    setup.addPackage("pkg-d", "1.0.0");
    setup.updateDependency("pkg-b", "pkg-a", "1.0.0");
    setup.updateDependency("pkg-c", "pkg-a", "~1.0.0");
    setup.updateDependency("pkg-d", "pkg-a", "^1.0.0");
  });

  it("should patch a single pinned dependent", () => {
    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );
    expect(individualReleases.length).toEqual(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.0.1");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("1.0.1");
  });
  it("should path a pinned and tilde dependents when minor versioning", () => {
    setup.addChangeset({
      id: "stuff-and-nonsense",
      releases: [{ name: "pkg-a", type: "minor" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(3);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.1.0");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("1.0.1");
    expect(individualReleases[2].name).toEqual("pkg-c");
    expect(individualReleases[2].newVersion).toEqual("1.0.1");
  });
  it("should patch pinned, tilde and caret dependents when a major versioning", () => {
    setup.addChangeset({
      id: "stuff-and-nonsense",
      releases: [{ name: "pkg-a", type: "major" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toEqual(4);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("1.0.1");
    expect(individualReleases[2].name).toEqual("pkg-c");
    expect(individualReleases[2].newVersion).toEqual("1.0.1");
    expect(individualReleases[3].name).toEqual("pkg-d");
    expect(individualReleases[3].newVersion).toEqual("1.0.1");
  });
});

describe("bumping peerDeps", () => {
  let setup: FakeFullState;
  beforeEach(() => {
    setup = new FakeFullState();
    setup.addPackage("pkg-b", "1.0.0");
  });

  it("should patch a pinned peerDep", () => {
    setup.updatePeerDependency("pkg-b", "pkg-a", "1.0.0");

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.0.1");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("1.0.1");
  });
  it("should not bump the dependent when bumping a tilde peerDep by none", () => {
    setup.updatePeerDependency("pkg-b", "pkg-a", "~1.0.0");
    setup.changesets = [];
    setup.addChangeset({
      id: "anyway-the-windblows",
      releases: [{ name: "pkg-a", type: "none" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(1);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.0.0");
  });
  it("should not bump the dependent when bumping a tilde peerDep by a patch", () => {
    setup.updatePeerDependency("pkg-b", "pkg-a", "~1.0.0");

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(1);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.0.1");
  });
  it("should major bump dependent when bumping a tilde peerDep by minor", () => {
    setup.updatePeerDependency("pkg-b", "pkg-a", "~1.0.0");
    setup.addChangeset({
      id: "anyway-the-windblows",
      releases: [{ name: "pkg-a", type: "minor" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.1.0");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("2.0.0");
  });
  it("should major bump dependent when bumping a tilde peerDep by major", () => {
    setup.updatePeerDependency("pkg-b", "pkg-a", "~1.0.0");
    setup.addChangeset({
      id: "anyway-the-windblows",
      releases: [{ name: "pkg-a", type: "major" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("2.0.0");
  });
  it("should not bump dependent when bumping caret peerDep by none", () => {
    setup.updatePeerDependency("pkg-b", "pkg-a", "^1.0.0");
    setup.changesets = [];
    setup.addChangeset({
      id: "anyway-the-windblows",
      releases: [{ name: "pkg-a", type: "none" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(1);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.0.0");
  });
  it("should not bump dependent when bumping caret peerDep by patch", () => {
    setup.updatePeerDependency("pkg-b", "pkg-a", "^1.0.0");

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(1);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.0.1");
  });
  it("should major bump dependent when bumping caret peerDep by minor", () => {
    setup.updatePeerDependency("pkg-b", "pkg-a", "^1.0.0");
    setup.addChangeset({
      id: "anyway-the-windblows",
      releases: [{ name: "pkg-a", type: "minor" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("1.1.0");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("2.0.0");
  });
  it("should major bump dependent when bumping caret peerDep by major", () => {
    setup.updatePeerDependency("pkg-b", "pkg-a", "^1.0.0");
    setup.addChangeset({
      id: "anyway-the-windblows",
      releases: [{ name: "pkg-a", type: "major" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(2);
    expect(individualReleases[0].name).toEqual("pkg-a");
    expect(individualReleases[0].newVersion).toEqual("2.0.0");
    expect(individualReleases[1].name).toEqual("pkg-b");
    expect(individualReleases[1].newVersion).toEqual("2.0.0");
  });
  it("should patch bump transitive dep that is only affected by peerDep bump", () => {
    setup.updatePeerDependency("pkg-b", "pkg-a", "^1.0.0");
    setup.addPackage("pkg-c", "1.0.0");
    setup.updateDependency("pkg-c", "pkg-b", "^1.0.0");
    setup.addChangeset({
      id: "anyway-the-windblows",
      releases: [{ name: "pkg-a", type: "minor" }],
    });

    let { individualReleases } = assembleReleasePlan(
      setup.changesets,
      setup.packages,
      defaultConfig,
      undefined
    );

    expect(individualReleases.length).toBe(3);
    expect(individualReleases[0]).toMatchObject({
      name: "pkg-a",
      newVersion: "1.1.0",
    });
    expect(individualReleases[1]).toMatchObject({
      name: "pkg-b",
      newVersion: "2.0.0",
    });
    expect(individualReleases[2]).toMatchObject({
      name: "pkg-c",
      newVersion: "1.0.1",
    });
  });

  describe("onlyUpdatePeerDependentsWhenOutOfRange: true", () => {
    it("should not bump dependent when still in range", () => {
      setup.updatePeerDependency("pkg-b", "pkg-a", "^1.0.0");
      setup.addChangeset({
        id: "anyway-the-windblows",
        releases: [{ name: "pkg-a", type: "minor" }],
      });
      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          ___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH: {
            ...defaultConfig.___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH,
            onlyUpdatePeerDependentsWhenOutOfRange: true,
          },
        },
        undefined
      );
      expect(individualReleases.length).toBe(1);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[0].newVersion).toEqual("1.1.0");
    });

    it("should major bump dependent when leaving range", () => {
      setup.updatePeerDependency("pkg-b", "pkg-a", "~1.0.0");
      setup.addChangeset({
        id: "anyway-the-windblows",
        releases: [{ name: "pkg-a", type: "minor" }],
      });

      let { individualReleases } = assembleReleasePlan(
        setup.changesets,
        setup.packages,
        {
          ...defaultConfig,
          ___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH: {
            ...defaultConfig.___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH,
            onlyUpdatePeerDependentsWhenOutOfRange: true,
          },
        },
        undefined
      );

      expect(individualReleases.length).toBe(2);
      expect(individualReleases[0].name).toEqual("pkg-a");
      expect(individualReleases[0].newVersion).toEqual("1.1.0");
      expect(individualReleases[1].name).toEqual("pkg-b");
      expect(individualReleases[1].newVersion).toEqual("2.0.0");
    });
  });
});

/*
    Bumping peerDeps is a tricky issue, so we are testing every single combination here so that
    we can have absolute certainty when changing anything to do with them.
    In general the rule for bumping peerDeps is that:
      * All MINOR or MAJOR peerDep bumps must MAJOR bump all dependents - regardless of ranges
      * Otherwise - normal patching rules apply
 */
