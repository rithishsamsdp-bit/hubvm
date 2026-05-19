import React from 'react';
import './styles/Badges.css';

const COLORS = ['#5856dc', '#5a7997', '#f46e34', '#d6dcff'];

const Badges = ({ badgeData = [] }) => {
  const totalCount = badgeData.length;
  const visibleCount = Math.min(3, totalCount);
  const visibleBadges = badgeData.slice(0, visibleCount);
  const extraCount = totalCount > 3 ? totalCount - 3 : 0;

  return (
    <div className="badge-container">
      {visibleBadges.map((value, index) => (
        <div
          key={index}
          className="badge"
          style={{
            backgroundColor: COLORS[index] || '#ccc',
            left: `${index * 17}px`,
            zIndex: index,
          }}
        >
          {value.slice(0, 3).toUpperCase()}
        </div>
      ))}

      {extraCount > 0 && (
        <div
          className="badge extra-badge"
          style={{
            left: `${visibleCount * 17}px`,
            zIndex: visibleCount,
          }}
        >
          +{extraCount}
        </div>
      )}
    </div>
  );
};

export default Badges;
