/**
 * 랜덤 데이터 생성
 */
function generateRandomStatistics() {
  const totalStudents = 34; // 고정된 총 학생 수
  const submissionRate = Math.floor(Math.random() * (100 - 60 + 1)) + 60;
  const submittedCount = Math.round((totalStudents * submissionRate) / 100);
  const notSubmittedCount = totalStudents - submittedCount;

  // 과제 정보
  const assignmentInfo = {
    title: "JavaScript 기초",
    deadline: "2024-11-20T10:00:00"
  };

  return {
    totalStudents,
    submissionRate,
    assignmentStatus: [
      {
        status: "제출",
        count: submittedCount
      },
      {
        status: "미제출",
        count: notSubmittedCount
      }
    ],
    assignmentInfo
  };
}
