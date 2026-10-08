// Import the library file directly: the package index runs a debug self-test when imported as ESM.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { extractSkills, tokenize, SKILLS } from '../utils/text.js';

export async function pdfToText(buffer) {
  const data = await pdfParse(buffer);
  return (data.text || '').replace(/\u0000/g, '').trim();
}

/** Pull profile fields out of resume text so onboarding takes seconds. */
export function parseResume(text = '') {
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  const phone = text.match(/(\+?\d[\d\s().-]{8,}\d)/)?.[0]?.trim();
  const link = (re) => text.match(re)?.[0];
  const years = [...text.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/gi)].map((m) => Number(m[1])).filter((n) => n < 45);
  const yearsExperience = years.length ? Math.max(...years) : undefined;
  const firstLines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const headline = firstLines.slice(1, 4).find((l) => l.length > 6 && l.length < 90 && !/@|\d{4,}/.test(l));
  let experienceLevel;
  if (yearsExperience !== undefined) experienceLevel = yearsExperience < 1 ? 'intern' : yearsExperience < 3 ? 'junior' : yearsExperience < 6 ? 'mid' : yearsExperience < 10 ? 'senior' : 'lead';
  return {
    email,
    phone,
    headline,
    yearsExperience,
    experienceLevel,
    skills: extractSkills(text),
    links: {
      linkedin: link(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+/i),
      github: link(/(https?:\/\/)?(www\.)?github\.com\/[\w-]+/i),
      portfolio: link(/https?:\/\/(?!.*(linkedin|github))[\w-]+\.[\w.\/-]+/i),
    },
  };
}

/** Free ATS checker: how well a resume covers a job description, plus formatting tips. */
export function atsCheck(resumeText = '', jobText = '') {
  const r = resumeText.toLowerCase();
  const jobSkills = extractSkills(jobText);
  const resumeSkills = extractSkills(resumeText);

  // Important non-skill keywords: most frequent meaningful words in the JD
  const freq = {};
  for (const t of tokenize(jobText)) if (t.length > 3 && !/^\d+$/.test(t)) freq[t] = (freq[t] || 0) + 1;
  const topWords = Object.entries(freq)
    .filter(([w]) => !SKILLS.includes(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w]) => w);

  const matchedSkills = jobSkills.filter((s) => resumeSkills.includes(s));
  const missingSkills = jobSkills.filter((s) => !resumeSkills.includes(s));
  const matchedWords = topWords.filter((w) => r.includes(w));
  const missingWords = topWords.filter((w) => !r.includes(w));

  const sections = {
    contact: /[\w.+-]+@[\w-]+\.[\w.-]+/.test(resumeText),
    summary: /\b(summary|profile|about me|objective)\b/i.test(resumeText),
    experience: /\b(experience|employment|work history)\b/i.test(resumeText),
    education: /\b(education|degree|university|bachelor|b\.sc|bsc|master|diploma)\b/i.test(resumeText),
    skills: /\b(skills|technologies|tools|stack)\b/i.test(resumeText),
  };
  const words = resumeText.split(/\s+/).filter(Boolean).length;
  const metrics = (resumeText.match(/\d+%|\$\d|\d+x|\b\d{2,}\b/g) || []).length;

  const tips = [];
  if (!sections.contact) tips.push('Add an email address near the top so recruiters can reach you.');
  if (!sections.summary) tips.push('Add a 2–3 line summary that says what you do and for whom.');
  if (!sections.skills) tips.push('Add a clear "Skills" section. Many ATS tools look for it by name.');
  if (!sections.experience) tips.push('Label your work history "Experience" so ATS tools can find it.');
  if (words < 250) tips.push('Your resume is short. Add detail on what you built and the results.');
  if (words > 1100) tips.push('Your resume is long. Aim for one to two pages and cut older roles.');
  if (metrics < 3) tips.push('Add numbers: users served, revenue, time saved, % improvements.');
  if (missingSkills.length) tips.push(`If you have them, mention: ${missingSkills.slice(0, 6).join(', ')}.`);
  if (!resumeText.trim()) tips.unshift("We couldn't read any text. If your PDF is a scanned image, export it again as a text PDF.");

  const skillScore = jobSkills.length ? matchedSkills.length / jobSkills.length : 0.6;
  const wordScore = topWords.length ? matchedWords.length / topWords.length : 0.6;
  const sectionScore = Object.values(sections).filter(Boolean).length / 5;
  const score = Math.round(skillScore * 50 + wordScore * 25 + sectionScore * 15 + (metrics >= 3 ? 10 : metrics * 3));

  return { score: Math.min(100, score), matchedSkills, missingSkills, matchedKeywords: matchedWords, missingKeywords: missingWords, sections, wordCount: words, tips };
}
