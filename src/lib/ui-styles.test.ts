/**
 * UI Styles Test Suite
 * Tests for optimized button and card styles across light and dark themes
 */

describe("Button Styles Optimization", () => {
  beforeEach(() => {
    // Reset DOM before each test
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
  });

  describe("Button Height Consistency", () => {
    test("btn-primary should have consistent height", () => {
      const button = document.createElement("button");
      button.className = "btn-primary";
      document.body.appendChild(button);

      const computedStyle = window.getComputedStyle(button);
      expect(computedStyle.height).toBe("3.5rem"); // 56px - consistent height
    });

    test("btn-secondary should have same height as btn-primary", () => {
      const primaryBtn = document.createElement("button");
      const secondaryBtn = document.createElement("button");
      primaryBtn.className = "btn-primary";
      secondaryBtn.className = "btn-secondary";

      document.body.appendChild(primaryBtn);
      document.body.appendChild(secondaryBtn);

      const primaryHeight = window.getComputedStyle(primaryBtn).height;
      const secondaryHeight = window.getComputedStyle(secondaryBtn).height;
      expect(primaryHeight).toBe(secondaryHeight);
    });

    test("all button variants should have consistent height", () => {
      const buttonVariants = [
        "btn-primary",
        "btn-secondary",
        "btn-outline",
        "btn-ghost",
        "btn-danger",
      ];
      const buttons = buttonVariants.map((variant) => {
        const btn = document.createElement("button");
        btn.className = variant;
        document.body.appendChild(btn);
        return btn;
      });

      const heights = buttons.map((btn) => window.getComputedStyle(btn).height);
      heights.forEach((height) => {
        expect(height).toBe("3.5rem");
      });
    });
  });

  describe("Focus State Accessibility", () => {
    test("btn-primary should have visible focus state", () => {
      const button = document.createElement("button");
      button.className = "btn-primary";
      document.body.appendChild(button);

      button.focus();
      const computedStyle = window.getComputedStyle(button, ":focus");

      // Check for focus ring
      expect(computedStyle.outline).not.toBe("none");
      expect(computedStyle.outlineWidth).not.toBe("0px");
    });

    test("focus ring should have proper contrast", () => {
      const button = document.createElement("button");
      button.className = "btn-primary";
      document.body.appendChild(button);

      button.focus();

      // Focus should be visible in both themes
      document.documentElement.classList.add("dark");
      const darkFocusStyle = window.getComputedStyle(button, ":focus");

      document.documentElement.classList.remove("dark");
      const lightFocusStyle = window.getComputedStyle(button, ":focus");

      expect(darkFocusStyle.outlineColor).not.toBe(lightFocusStyle.outlineColor);
    });
  });

  describe("Hover and Active States", () => {
    test("btn-primary should have smooth hover transition", () => {
      const button = document.createElement("button");
      button.className = "btn-primary";
      document.body.appendChild(button);

      const computedStyle = window.getComputedStyle(button);
      expect(computedStyle.transition).toContain("transform");
      expect(computedStyle.transition).toContain("background-color");
    });

    test("btn-primary should have active state with downward transform", () => {
      const button = document.createElement("button");
      button.className = "btn-primary";
      document.body.appendChild(button);

      // Simulate active state
      button.classList.add("active");
      const computedStyle = window.getComputedStyle(button);

      expect(computedStyle.transform).toContain("translateY(4px)");
    });
  });

  describe("Theme-Specific Shadows", () => {
    test("btn-primary should have different shadows in light vs dark theme", () => {
      const button = document.createElement("button");
      button.className = "btn-primary";
      document.body.appendChild(button);

      // Light theme shadow
      const lightShadow = window.getComputedStyle(button).boxShadow;

      // Dark theme shadow
      document.documentElement.classList.add("dark");
      const darkShadow = window.getComputedStyle(button).boxShadow;

      expect(lightShadow).not.toBe(darkShadow);
      expect(darkShadow).toContain("rgba(0, 0, 0"); // Dark theme should be darker
    });
  });

  describe("Button Bottom Width Enhancement", () => {
    test("btn-primary should have emphasized bottom border", () => {
      const button = document.createElement("button");
      button.className = "btn-primary";
      document.body.appendChild(button);

      const computedStyle = window.getComputedStyle(button);
      expect(computedStyle.borderBottomWidth).toBe("4px");
    });

    test("bottom border should be removed in active state", () => {
      const button = document.createElement("button");
      button.className = "btn-primary";
      button.classList.add("active");
      document.body.appendChild(button);

      const computedStyle = window.getComputedStyle(button);
      expect(computedStyle.borderBottomWidth).toBe("0px");
    });
  });
});

describe("Card Styles Optimization", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
  });

  describe("Card Shadow System", () => {
    test("card-default should have appropriate shadow in light theme", () => {
      const card = document.createElement("div");
      card.className = "card-default";
      document.body.appendChild(card);

      const computedStyle = window.getComputedStyle(card);
      const shadow = computedStyle.boxShadow;

      expect(shadow).toContain("rgba(15, 23, 42"); // Should use light theme shadow
    });

    test("card-default should have deeper shadow in dark theme", () => {
      const card = document.createElement("div");
      card.className = "card-default";
      document.body.appendChild(card);

      document.documentElement.classList.add("dark");
      const computedStyle = window.getComputedStyle(card);
      const shadow = computedStyle.boxShadow;

      expect(shadow).toContain("rgba(0, 0, 0"); // Dark theme should use darker shadows
    });

    test("card-elevated should have stronger shadow than card-default", () => {
      const defaultCard = document.createElement("div");
      const elevatedCard = document.createElement("div");
      defaultCard.className = "card-default";
      elevatedCard.className = "card-elevated";

      document.body.appendChild(defaultCard);
      document.body.appendChild(elevatedCard);

      const defaultShadow = window.getComputedStyle(defaultCard).boxShadow;
      const elevatedShadow = window.getComputedStyle(elevatedCard).boxShadow;

      expect(defaultShadow).not.toBe(elevatedShadow);
    });
  });

  describe("Card Bottom Border Emphasis", () => {
    test("card-bordered should have emphasized bottom border", () => {
      const card = document.createElement("div");
      card.className = "card-bordered";
      document.body.appendChild(card);

      const computedStyle = window.getComputedStyle(card);
      expect(computedStyle.borderBottomWidth).toBe("4px");
    });

    test("bottom border should be visible in both themes", () => {
      const card = document.createElement("div");
      card.className = "card-bordered";
      document.body.appendChild(card);

      const lightBorder = window.getComputedStyle(card).borderBottomColor;

      document.documentElement.classList.add("dark");
      const darkBorder = window.getComputedStyle(card).borderBottomColor;

      expect(lightBorder).not.toBe("transparent");
      expect(darkBorder).not.toBe("transparent");
    });
  });

  describe("Card Hover Effects", () => {
    test("card-interactive should have hover animation", () => {
      const card = document.createElement("div");
      card.className = "card-interactive";
      document.body.appendChild(card);

      const computedStyle = window.getComputedStyle(card);
      expect(computedStyle.transition).toContain("transform");
      expect(computedStyle.transition).toContain("box-shadow");
    });

    test("card-interactive should lift on hover", () => {
      const card = document.createElement("div");
      card.className = "card-interactive";
      document.body.appendChild(card);

      // Simulate hover
      card.classList.add("hover");
      const computedStyle = window.getComputedStyle(card);

      expect(computedStyle.transform).toContain("translateY(-0.25rem)");
    });
  });

  describe("Card Consistency", () => {
    test("all cards should have consistent border radius", () => {
      const cardTypes = ["card-default", "card-elevated", "card-bordered", "card-interactive"];
      const cards = cardTypes.map((type) => {
        const card = document.createElement("div");
        card.className = type;
        document.body.appendChild(card);
        return card;
      });

      const borderRadiuses = cards.map((card) => window.getComputedStyle(card).borderRadius);
      const firstRadius = borderRadiuses[0];

      borderRadiuses.forEach((radius) => {
        expect(radius).toBe(firstRadius);
      });
    });

    test("all cards should have consistent padding", () => {
      const cardTypes = ["card-default", "card-elevated", "card-bordered", "card-interactive"];
      const cards = cardTypes.map((type) => {
        const card = document.createElement("div");
        card.className = type;
        document.body.appendChild(card);
        return card;
      });

      const paddings = cards.map((card) => window.getComputedStyle(card).padding);
      const firstPadding = paddings[0];

      paddings.forEach((padding) => {
        expect(padding).toBe(firstPadding);
      });
    });
  });
});

describe("Theme Consistency Tests", () => {
  test("all components should maintain visual hierarchy in light theme", () => {
    // Test that buttons, cards, and other elements maintain proper visual hierarchy
    const button = document.createElement("button");
    const card = document.createElement("div");
    button.className = "btn-primary";
    card.className = "card-default";

    document.body.appendChild(button);
    document.body.appendChild(card);

    const buttonZIndex = window.getComputedStyle(button).zIndex;
    const cardZIndex = window.getComputedStyle(card).zIndex;

    // Should maintain proper stacking
    expect(buttonZIndex).not.toBe(cardZIndex);
  });

  test("all components should maintain visual hierarchy in dark theme", () => {
    document.documentElement.classList.add("dark");

    const button = document.createElement("button");
    const card = document.createElement("div");
    button.className = "btn-primary";
    card.className = "card-default";

    document.body.appendChild(button);
    document.body.appendChild(card);

    const buttonShadow = window.getComputedStyle(button).boxShadow;
    const cardShadow = window.getComputedStyle(card).boxShadow;

    // Should maintain depth perception
    expect(buttonShadow).not.toBe(cardShadow);
  });
});
