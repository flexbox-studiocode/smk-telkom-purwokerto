import TeacherPhoto from './TeacherPhoto';
import TeacherCardBorder from './TeacherCardBorder';

export default function TeacherCard({ teacher, name = teacher.nama, role = teacher.jabatan, alt, loading = 'lazy', children }) {
  return <article className="teacher-card h-full min-w-0">
    <div className="teacher-card-portrait">
      <TeacherPhoto teacher={teacher} alt={alt || name} loading={loading} className="teacher-card-photo" />
      <div className="teacher-card-label">
        <h3>{name}</h3>
        {role && <p>{role}</p>}
      </div>
      <TeacherCardBorder />
    </div>
    {children && <div className="teacher-card-description">{children}</div>}
  </article>;
}
