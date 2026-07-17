# Reviews and moderation

Reviews belong to an authenticated author and an exact course offering, academic year, term, and
optional instructor. Ratings cover overall experience, teaching, workload, difficulty, grading,
and usefulness. Recommendation, attendance expectation, assessment summary, prose, timestamps,
and public-anonymity choice are stored separately.

The database permits one active review per author, offering, and instructor scope; a null
instructor is normalized in the unique index. Edits preserve a revision snapshot, and deletion is
soft. Public anonymous responses use a generic author label and never return account identifiers or
email addresses. Aggregates include only currently published, non-deleted reviews and state the
contributing review count.

Votes are relational and unique per user and review. Reports have a category, optional explanation,
status, resolution note, moderator, and audit timestamps. Only `moderator` and `admin` roles may
open or resolve the queue. Hiding a review is an explicit moderation outcome; reports never change
academic source data.

Reviews are student-contributed opinion, not authoritative academic information. CUWeave does not
import RateCUHK or CUtopia reviews.
