import {
  ratingDimensions,
  type RatingValues,
  type ReviewInput,
} from '@cuweave/db'

export function parseReviewInput(body: Record<string, unknown>): ReviewInput {
  const source =
    typeof body.ratings === 'object' && body.ratings ? body.ratings : {}
  const ratings = Object.fromEntries(
    ratingDimensions.map((dimension) => [
      dimension,
      Number((source as Record<string, unknown>)[dimension]),
    ])
  ) as RatingValues
  return {
    offeringId: typeof body.offeringId === 'string' ? body.offeringId : '',
    instructorId:
      typeof body.instructorId === 'string' && body.instructorId
        ? body.instructorId
        : null,
    isAnonymous: body.isAnonymous !== false,
    recommendation:
      typeof body.recommendation === 'boolean' ? body.recommendation : null,
    attendanceRequirement:
      body.attendanceRequirement === 'required' ||
      body.attendanceRequirement === 'optional'
        ? body.attendanceRequirement
        : 'unknown',
    assessmentSummary:
      typeof body.assessmentSummary === 'string' ? body.assessmentSummary : '',
    body: typeof body.body === 'string' ? body.body : '',
    ratings,
  }
}
