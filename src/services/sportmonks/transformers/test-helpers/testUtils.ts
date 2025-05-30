/**
 * Test utilities for transformer testing
 */

// Mock Payload CMS for tests
export const mockPayload = {
  find: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

/**
 * Assertion helpers for common test patterns
 */
export const assertTransformedFields = {
  /**
   * Assert that all expected fields are present in transformed object
   */
  hasAllFields<T extends Record<string, any>>(
    result: T,
    expectedFields: (keyof T)[]
  ): void {
    expectedFields.forEach(field => {
      expect(result).toHaveProperty(String(field))
    })
  },

  /**
   * Assert that null/undefined fields are properly handled
   */
  handlesNullFields<T extends Record<string, any>>(
    result: T,
    nullFields: (keyof T)[]
  ): void {
    nullFields.forEach(field => {
      expect(result[field]).toBeNull()
    })
  },

  /**
   * Assert that required fields have expected values
   */
  hasRequiredValues<T extends Record<string, any>>(
    result: T,
    expectedValues: Partial<T>
  ): void {
    Object.entries(expectedValues).forEach(([key, value]) => {
      expect(result[key]).toBe(value)
    })
  },
}

/**
 * Test data validation helpers
 */
export const testValidation = {
  /**
   * Test that validation function throws for missing required fields
   */
  async expectValidationError(
    validationFn: (data: any) => Promise<void> | void,
    invalidData: any,
    expectedErrorMessage?: string
  ): Promise<void> {
    if (expectedErrorMessage) {
      await expect(validationFn(invalidData)).rejects.toThrow(expectedErrorMessage)
    } else {
      await expect(validationFn(invalidData)).rejects.toThrow()
    }
  },

  /**
   * Test that validation function passes for valid data
   */
  async expectValidationSuccess(
    validationFn: (data: any) => Promise<void> | void,
    validData: any
  ): Promise<void> {
    await expect(validationFn(validData)).resolves.not.toThrow()
  },
}

/**
 * Setup helpers for tests
 */
export const testSetup = {
  /**
   * Reset all mocks before each test
   */
  beforeEach(): void {
    jest.clearAllMocks()
    
    // Reset mockPayload to default behavior
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPayload.create.mockResolvedValue({})
    mockPayload.update.mockResolvedValue({})
    mockPayload.delete.mockResolvedValue({})
  },

  /**
   * Setup mock leagues for team transformer tests
   */
  setupMockLeagues(leagues: { id: number; name: string }[]): void {
    mockPayload.find.mockResolvedValue({
      docs: leagues,
    })
  },

  /**
   * Setup mock payload error
   */
  setupPayloadError(error: Error): void {
    mockPayload.find.mockRejectedValue(error)
  },
}

/**
 * Common test patterns
 */
export const testPatterns = {
  /**
   * Test basic transformation functionality
   */
  async testBasicTransformation<TInput, TOutput extends Record<string, any>>(
    transformFn: (input: TInput) => TOutput | Promise<TOutput>,
    input: TInput,
    expectedFields: (keyof TOutput)[]
  ): Promise<TOutput> {
    const result = await transformFn(input)
    
    // Check that result is an object
    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
    expect(result).not.toBeNull()
    
    // Check that all expected fields are present
    assertTransformedFields.hasAllFields(result as TOutput, expectedFields)
    
    return result
  },

  /**
   * Test null/undefined field handling
   */
  async testNullFieldHandling<TInput, TOutput extends Record<string, any>>(
    transformFn: (input: TInput) => TOutput | Promise<TOutput>,
    inputWithNulls: TInput,
    nullableFields: (keyof TOutput)[]
  ): Promise<void> {
    const result = await transformFn(inputWithNulls)
    assertTransformedFields.handlesNullFields(result as TOutput, nullableFields)
  },

  /**
   * Test validation error scenarios
   */
  async testValidationErrors<TInput>(
    validationFn: (input: TInput) => Promise<void> | void,
    invalidInputs: { data: TInput; expectedError: string }[]
  ): Promise<void> {
    for (const { data, expectedError } of invalidInputs) {
      await testValidation.expectValidationError(validationFn, data, expectedError)
    }
  },
}

/**
 * Performance testing helpers
 */
export const performanceHelpers = {
  /**
   * Measure execution time of a function
   */
  async measureExecutionTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; timeMs: number }> {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    return { result, timeMs: end - start }
  },

  /**
   * Test that function executes within time limit
   */
  async expectExecutionTimeUnder<T>(
    fn: () => Promise<T> | T,
    maxTimeMs: number
  ): Promise<T> {
    const { result, timeMs } = await this.measureExecutionTime(fn)
    expect(timeMs).toBeLessThan(maxTimeMs)
    return result
  },
}