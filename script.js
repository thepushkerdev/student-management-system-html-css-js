const STORAGE_KEY = "studentManagementSystemRecords";
const form = document.getElementById("studentForm");
const nameInput = document.getElementById("name");
const rollInput = document.getElementById("roll");
const courseInput = document.getElementById("course");
const marksInput = document.getElementById("marks");
const emailInput = document.getElementById("email");
const editIdInput = document.getElementById("editId");
const tableBody = document.getElementById("studentTable");
const message = document.getElementById("message");
const searchInput = document.getElementById("search");
let students = loadStudents();

function loadStudents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}
function saveStudents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}
function showMessage(text, type = "success") {
  message.textContent = text;
  message.className = `message ${type}`;
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function percentage(marks) {
  return `${Number(marks).toFixed(2)}%`;
}
function renderStudents() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = students.filter(student =>
    [student.name, student.roll, student.course, student.email]
      .some(value => String(value ?? "").toLowerCase().includes(query))
  );

  document.getElementById("totalStudents").textContent = students.length;
  const average = students.length
    ? students.reduce((sum, student) => sum + Number(student.marks), 0) / students.length
    : null;
  document.getElementById("averageMarks").textContent = average === null ? "—" : `${average.toFixed(1)}%`;
  document.getElementById("totalCourses").textContent = new Set(students.map(s => s.course)).size;
  document.getElementById("recordCount").textContent = `${filtered.length} of ${students.length} record${students.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td colspan="7" class="empty">${query ? "No matching students found." : "No student records yet. Add your first student above."}</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(student => `
    <tr>
      <td><strong>${escapeHTML(student.name)}</strong></td>
      <td>${escapeHTML(student.roll)}</td>
      <td><span class="course-pill">${escapeHTML(student.course)}</span></td>
      <td>${Number(student.marks).toFixed(2)}</td>
      <td>${percentage(student.marks)}</td>
      <td>${escapeHTML(student.email || "—")}</td>
      <td><div class="actions">
        <button class="action-btn edit-btn" data-action="edit" data-id="${escapeHTML(student.id)}">Edit</button>
        <button class="action-btn delete-btn" data-action="delete" data-id="${escapeHTML(student.id)}">Delete</button>
      </div></td>
    </tr>`).join("");
}
function resetForm() {
  form.reset();
  editIdInput.value = "";
  document.getElementById("formTitle").textContent = "Add Student";
  document.getElementById("submitButton").textContent = "Add Student";
  document.getElementById("cancelEdit").classList.add("hidden");
}
form.addEventListener("submit", event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const roll = rollInput.value.trim();
  const course = courseInput.value;
  const marks = Number(marksInput.value);
  const email = emailInput.value.trim();
  const editingId = editIdInput.value;

  if (!name || !roll || !course || marksInput.value === "") {
    showMessage("Please complete all required fields.", "error");
    return;
  }
  if (!Number.isFinite(marks) || marks < 0 || marks > 100) {
    showMessage("Marks must be between 0 and 100.", "error");
    return;
  }
  const duplicate = students.some(student =>
    student.roll.toLowerCase() === roll.toLowerCase() && student.id !== editingId
  );
  if (duplicate) {
    showMessage("This roll number already exists. Please use a unique roll number.", "error");
    return;
  }

  if (editingId) {
    students = students.map(student => student.id === editingId
      ? {...student, name, roll, course, marks, email} : student);
    showMessage("Student record updated successfully.");
  } else {
    students.push({id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), name, roll, course, marks, email});
    showMessage("Student added successfully.");
  }
  saveStudents();
  resetForm();
  renderStudents();
});
document.getElementById("cancelEdit").addEventListener("click", () => {
  resetForm();
  showMessage("Edit cancelled.");
});
document.getElementById("clearForm").addEventListener("click", () => {
  setTimeout(() => {
    editIdInput.value = "";
    document.getElementById("formTitle").textContent = "Add Student";
    document.getElementById("submitButton").textContent = "Add Student";
    document.getElementById("cancelEdit").classList.add("hidden");
    message.textContent = "";
    message.className = "message";
  }, 0);
});
searchInput.addEventListener("input", renderStudents);
tableBody.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const student = students.find(item => item.id === button.dataset.id);
  if (!student) return;

  if (button.dataset.action === "edit") {
    editIdInput.value = student.id;
    nameInput.value = student.name;
    rollInput.value = student.roll;
    courseInput.value = student.course;
    marksInput.value = student.marks;
    emailInput.value = student.email || "";
    document.getElementById("formTitle").textContent = "Edit Student";
    document.getElementById("submitButton").textContent = "Save Changes";
    document.getElementById("cancelEdit").classList.remove("hidden");
    window.scrollTo({top: 0, behavior: "smooth"});
    showMessage("Update the details and select Save Changes.");
  } else if (button.dataset.action === "delete") {
    if (confirm(`Delete the record for ${student.name}?`)) {
      students = students.filter(item => item.id !== student.id);
      saveStudents();
      renderStudents();
      showMessage("Student record deleted.");
      if (editIdInput.value === student.id) resetForm();
    }
  }
});
document.getElementById("exportCsv").addEventListener("click", () => {
  if (!students.length) {
    showMessage("There are no records to export.", "error");
    return;
  }
  const headers = ["Name", "Roll Number", "Course", "Marks", "Percentage", "Email"];
  const rows = students.map(s => [s.name, s.roll, s.course, s.marks, percentage(s.marks), s.email || ""]);
  const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "student-records.csv";
  link.click();
  URL.revokeObjectURL(url);
  showMessage("CSV export downloaded.");
});
renderStudents();
