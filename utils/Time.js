// Utils/time.js

function getTodayDate() {
  const date = new Date().toLocaleString("en-US", {
    timeZone: "Africa/Addis_Ababa",
    hour12: true,
  });

  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours() % 12 || 12).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} ${ampm}`;
}

module.exports = { getTodayDate };
