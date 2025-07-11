import React from 'react';

interface Props {
  voted: boolean;
  onVote: () => void;
}

export default function ImageVoteButton({ voted, onVote }: Props) {
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={onVote}
      disabled={voted}
      title={voted ? '投票済み' : '投票'}
    >
      👍 {voted ? '投票済' : '投票'}
    </button>
  );
}
