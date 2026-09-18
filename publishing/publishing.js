const inquiryForm = document.querySelector("#publishing-inquiry-form");
const inquiryStatus = document.querySelector("#inquiry-status");

inquiryForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(inquiryForm);
  const name = String(data.get("author_name") || "").trim();
  const email = String(data.get("author_email") || "").trim();
  const projectType = String(data.get("project_type") || "").trim();
  const wordCount = String(data.get("word_count") || "Not supplied").trim();
  const currentFile = String(data.get("current_file") || "").trim();
  const targetDate = String(data.get("target_date") || "Not supplied").trim();
  const note = String(data.get("project_note") || "").trim();

  const subject = `INNERGREADS PUBLISHING inquiry: ${projectType}`;
  const body = [
    "INNERGREADS PUBLISHING inquiry",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Project: ${projectType}`,
    `Estimated word count: ${wordCount}`,
    `Current file: ${currentFile}`,
    `Target release date: ${targetDate}`,
    "",
    "What the book needs:",
    note,
    "",
    "I understand that no payment or manuscript file was submitted through this form.",
  ].join("\n");

  inquiryStatus.textContent = "Your email app will open with the project details. Review the message, then send it.";
  window.location.href = `mailto:nasgfx215@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
