import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import "../styles/developer-questions.css";

const DEFAULT_CASES = `[
  {
    "input": { "nums": [2, 7, 11, 15], "target": 9 },
    "expected": [0, 1]
  }
]`;

const DEFAULT_EXAMPLES = `[
  {
    "input": "nums = [2,7,11,15], target = 9",
    "output": "[0, 1]",
    "explanation": "nums[0] + nums[1] equals 9."
  }
]`;

const initialForm = {
  title: "",
  difficulty: "easy",
  points: 100,
  description: "",
  constraints: "",
  starter_code: "",
  test_cases: DEFAULT_CASES,
  examples: DEFAULT_EXAMPLES,
};

function parseJsonArray(value, label) {
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON array.`);
  }
  return parsed;
}

function DeveloperQuestions() {
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [questions, setQuestions] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const isDeveloper = user?.role === "developer";
  const preview = useMemo(() => {
    try {
      return {
        testCases: parseJsonArray(form.test_cases, "Test cases").length,
        examples: parseJsonArray(form.examples, "Examples").length,
      };
    } catch {
      return { testCases: 0, examples: 0 };
    }
  }, [form.test_cases, form.examples]);

  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const response = await api.get("/questions");
      setQuestions(Array.isArray(response.data) ? response.data : []);
    } catch {
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    if (isDeveloper) {
      loadQuestions();
    }
  }, [isDeveloper, loadQuestions]);

  if (!isDeveloper) {
    return <Navigate to="/dashboard" replace />;
  }

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });
    setSaving(true);

    try {
      const payload = {
        title: form.title,
        difficulty: form.difficulty,
        points: Number(form.points),
        description: form.description,
        constraints: form.constraints || null,
        starter_code: form.starter_code || null,
        test_cases: parseJsonArray(form.test_cases, "Test cases"),
        examples: parseJsonArray(form.examples, "Examples"),
      };

      const response = await api.post("/questions", payload);
      setStatus({
        type: "success",
        message: `Question saved: ${response.data.title}`,
      });
      setForm(initialForm);
      loadQuestions();
    } catch (error) {
      const message = error.response?.data?.detail || error.message || "Unable to save question.";
      setStatus({ type: "error", message: Array.isArray(message) ? message[0]?.msg : message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (questionId) => {
    setStatus({ type: "", message: "" });
    try {
      await api.delete(`/questions/${questionId}`);
      setQuestions((current) => current.filter((question) => question.id !== questionId));
      setStatus({ type: "success", message: "Question deleted." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.detail || "Unable to delete question.",
      });
    }
  };

  return (
    <section className="page-shell developer-page page-enter">
      <div className="page-container developer-layout">
        <div className="developer-header">
          <div>
            <span className="eyebrow"><span className="eyebrow__dot" />Developer Console</span>
            <h1 className="section-title">Add coding question</h1>
            <p className="section-subtitle">
              New questions are saved through the backend database connection, so production writes go straight to Railway PostgreSQL.
            </p>
          </div>
          <div className="developer-meta surface-card">
            <span className="label-text">Signed in as</span>
            <strong>{user.username}</strong>
            <span className="status-chip">Developer</span>
          </div>
        </div>

        <form className="developer-form surface-card" onSubmit={handleSubmit}>
          <div className="developer-form__grid">
            <Input label="Title" name="title" value={form.title} onChange={updateField} required maxLength="150" />
            <label className="block">
              <span className="ui-field-label">Difficulty</span>
              <select className="ui-input" name="difficulty" value={form.difficulty} onChange={updateField}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <Input label="Points" name="points" type="number" min="1" max="10000" value={form.points} onChange={updateField} required />
          </div>

          <label className="block">
            <span className="ui-field-label">Description</span>
            <textarea className="ui-input developer-textarea developer-textarea--lg" name="description" value={form.description} onChange={updateField} required />
          </label>

          <label className="block">
            <span className="ui-field-label">Constraints</span>
            <textarea className="ui-input developer-textarea" name="constraints" value={form.constraints} onChange={updateField} />
          </label>

          <label className="block">
            <span className="ui-field-label">Starter code</span>
            <textarea className="ui-input developer-textarea developer-code" name="starter_code" value={form.starter_code} onChange={updateField} />
          </label>

          <div className="developer-json-grid">
            <label className="block">
              <span className="ui-field-label">Test cases JSON</span>
              <textarea className="ui-input developer-textarea developer-code" name="test_cases" value={form.test_cases} onChange={updateField} required />
            </label>
            <label className="block">
              <span className="ui-field-label">Examples JSON</span>
              <textarea className="ui-input developer-textarea developer-code" name="examples" value={form.examples} onChange={updateField} />
            </label>
          </div>

          <div className="developer-form__footer">
            <div className="developer-preview">
              <span>{preview.testCases} test cases</span>
              <span>{preview.examples} examples</span>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Question"}
            </Button>
          </div>

          {status.message && (
            <div className={`developer-alert developer-alert--${status.type}`}>
              {status.message}
            </div>
          )}
        </form>

        <div className="developer-form surface-card">
          <div className="developer-form__footer">
            <div>
              <p className="label-text">Management Panel</p>
              <h2>Question bank</h2>
            </div>
            <Button type="button" variant="secondary" onClick={loadQuestions} disabled={loadingQuestions}>
              {loadingQuestions ? "Loading..." : "Refresh"}
            </Button>
          </div>

          <div className="developer-question-list">
            {questions.length === 0 ? (
              <p className="muted-text">No questions found.</p>
            ) : (
              questions.map((question) => (
                <div key={question.id} className="developer-question-row">
                  <div>
                    <strong>{question.title}</strong>
                    <p className="muted-text">{question.difficulty} · {question.points} pts</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => handleDelete(question.id)}>
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DeveloperQuestions;
