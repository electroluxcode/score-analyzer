import { Card } from './Card';
import { Select } from './Select';
import { SUBJECTS } from '../types';

interface ExamSubjectFilterProps {
  examNumbers: number[];
  examNames: { [key: number]: string };
  selectedExams: number[];
  onExamsChange: (exams: number[]) => void;
  subjectType: 'total' | 'subject';
  selectedSubject: string;
  onSubjectTypeChange: (type: 'total' | 'subject') => void;
  onSubjectChange: (subject: string) => void;
}

export function ExamSubjectFilter({
  examNumbers,
  examNames,
  selectedExams,
  onExamsChange,
  subjectType,
  selectedSubject,
  onSubjectTypeChange,
  onSubjectChange,
}: ExamSubjectFilterProps) {
  return (
    <Card>
      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium text-dark-textSecondary mb-3 block">
            选择考试次数（不选择则分析全部）
          </label>
          <div className="flex flex-wrap gap-2.5">
            {examNumbers.map((num) => (
              <label
                key={num}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-surface2 border border-dark-border cursor-pointer hover:bg-dark-surface3 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedExams.includes(num)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onExamsChange([...selectedExams, num]);
                    } else {
                      onExamsChange(selectedExams.filter(n => n !== num));
                    }
                  }}
                  className="rounded w-4 h-4"
                />
                <span className="text-sm text-dark-textSecondary font-medium">{examNames[num] || `第${num}次`}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="border-t border-dark-border pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="学科类型"
              value={subjectType}
              onChange={(e) => {
                const type = e.target.value as 'total' | 'subject';
                onSubjectTypeChange(type);
                if (type === 'total') {
                  onSubjectChange('total');
                } else if (selectedSubject === 'total') {
                  onSubjectChange('chinese');
                }
              }}
            >
              <option value="total">总分</option>
              <option value="subject">单科</option>
            </Select>
            <Select
              label="选择学科"
              value={selectedSubject}
              onChange={(e) => onSubjectChange(e.target.value)}
              disabled={subjectType === 'total'}
            >
              {subjectType === 'total' ? (
                <option value="total">总分</option>
              ) : (
                SUBJECTS.filter(s => s.key !== 'total').map((subject) => (
                  <option key={subject.key} value={subject.key}>
                    {subject.label}
                  </option>
                ))
              )}
            </Select>
          </div>
        </div>
      </div>
    </Card>
  );
}
