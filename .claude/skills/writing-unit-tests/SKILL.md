---
description: A Skill for writing effective unit tests in TypeScript
  using Jest, following best practices and guidelines.
name: writing-unit-tests
---

# Writing Unit Tests Skill

## Instructions

Follow these core patterns and best practices when writing unit tests
for this project:

1.  **Framework**: Use `Jest` for all unit tests.

2.  **Organization**:

   -   Name test files with the `.test.ts` suffix (e.g.,
       `version-service.test.ts`) and place them alongside the modules
       they test.
   -   Group tests within `describe` blocks named after the class,
       function, or feature being tested.
   -   Use nested `describe` blocks where helpful for clarity.

3.  **Naming Conventions**:

   -   Test names should follow the pattern:\
       `should <expected behavior> when <scenario>`
   -   Example:\
       `it("should read the version file once and cache the result when getVersion is called multiple times", ...)`
   -   Use variable prefixes like:
      -   `given*`
      -   `actual*`
      -   `expected*`
   -   Use `"foo-*"` style strings for test values.

4.  **Structure (BDD Pattern)**:

   -   Use the **Given-When-Then (GWT)** pattern.
   -   Clearly separate sections using comments:
      -   `// GIVEN`
      -   `// WHEN`
      -   `// THEN`
      -   `// AND`
   -   Focus on behavior, not implementation details.

5.  **Test Values**:

   -   Use descriptive `"foo-*"` values.
   -   Use factory functions for complex objects.
   -   Always reference `given*` variables in assertions.

6.  **Mocking**:

   -   Use `jest.mock`, `jest.spyOn`, `jest.fn`.
   -   Use helpers like `mockReturnValue`, `mockResolvedValue`,
       `mockRejectedValue`.

7.  **Async Testing**:

   -   Use `async/await`.
   -   Always await promises.
   -   Use `rejects.toThrow` for async errors.

8.  **Assertions**:

   -   Use Jest matchers like `toBe`, `toEqual`,
       `toHaveBeenCalledWith`.

9.  **Coverage**:

   -   Cover happy paths, edge cases, and errors.

------------------------------------------------------------------------

## Example

``` ts
describe("MyClass", () => {
  it("should return the expected value when given specific input", () => {
    // GIVEN
    const givenValue = 10;

    // WHEN
    const actualResult = myFunction(givenValue);

    // THEN
    const expectedResult = 20;
    expect(actualResult).toBe(expectedResult);
  });
});
```
