import type {
  PollOptionRecord,
  PostRecord,
  ResultRecord,
  VoteDistributionItem,
  VoteRecord,
} from './types';

export interface FormattedResultPost {
  text: string;
  resultRecord: ResultRecord;
}

export class ResultGenerator {
  generate(params: {
    interactionId: string;
    post: PostRecord;
    pollOptions: PollOptionRecord[];
    activeVotes: VoteRecord[];
    nowIso?: string;
  }): FormattedResultPost {
    const now = params.nowIso ?? new Date().toISOString();
    const totalParticipants = params.activeVotes.length;

    // Count occurrences of each option index from active votes
    const counts = new Map<number, number>();
    for (const opt of params.pollOptions) {
      counts.set(opt.optionIndex, 0);
    }

    for (const v of params.activeVotes) {
      for (const idx of v.selectedOptionIndices) {
        counts.set(idx, (counts.get(idx) ?? 0) + 1);
      }
    }

    let maxVotes = -1;
    let winningIndex: number | null = null;
    let winningText: string | null = null;

    const distribution: VoteDistributionItem[] = params.pollOptions.map((opt) => {
      const voteCount = counts.get(opt.optionIndex) ?? 0;
      const percentage =
        totalParticipants > 0 ? Math.round((voteCount / totalParticipants) * 1000) / 10 : 0;

      if (voteCount > maxVotes && voteCount > 0) {
        maxVotes = voteCount;
        winningIndex = opt.optionIndex;
        winningText = opt.optionText;
      }

      return {
        optionIndex: opt.optionIndex,
        optionText: opt.optionText,
        voteCount,
        percentage,
        isWinner: false,
      };
    });

    // Mark winner(s)
    if (winningIndex !== null) {
      for (const item of distribution) {
        if (item.voteCount === maxVotes && maxVotes > 0) {
          item.isWinner = true;
        }
      }
    }

    const winningPercentage =
      totalParticipants > 0 && maxVotes > 0
        ? Math.round((maxVotes / totalParticipants) * 1000) / 10
        : null;

    // Extract payoff from post payload
    const payload = params.post.payload as Record<string, any>;
    const payoff = (payload.payoff as Record<string, any>) || {};

    const revealText =
      payoff.reveal ||
      payload.twist ||
      payoff.surprisingOutcome ||
      'The consequences of your choices have unfolded.';

    const resultRecordId = `res_${params.interactionId}`;
    const resultRecord: ResultRecord = {
      id: resultRecordId,
      interactionId: params.interactionId,
      postId: params.post.id,
      totalParticipants,
      winningOptionIndex: winningIndex,
      winningOptionText: winningText,
      winningPercentage,
      voteDistribution: distribution,
      payoff,
      revealText,
      status: 'generated',
      createdAt: now,
    };

    // Format engaging Telegram HTML text
    const text = this.formatResultHtml(params.post.title, totalParticipants, distribution, revealText, payoff);

    return { text, resultRecord };
  }

  private formatResultHtml(
    title: string,
    totalParticipants: number,
    distribution: VoteDistributionItem[],
    revealText: string,
    payoff: Record<string, any>,
  ): string {
    const lines: string[] = [];

    lines.push(`<b>📊 THE VERDICT: ${escapeHtml(title)}</b>\n`);

    if (totalParticipants === 0) {
      lines.push('<i>No decisive votes logged before interaction closure.</i>\n');
    } else {
      lines.push(`Total Decisions Logged: <b>${totalParticipants}</b>\n`);
      lines.push('<b>Vote Breakdown:</b>');
      for (const item of distribution) {
        const barLength = Math.round(item.percentage / 10);
        const bar = '█'.repeat(barLength) + '░'.repeat(Math.max(0, 10 - barLength));
        const badge = item.isWinner ? ' 🏆 [Plurality Choice]' : '';
        lines.push(
          `• <b>${escapeHtml(item.optionText)}</b>: ${item.percentage}% (${item.voteCount} votes)${badge}\n  <code>${bar}</code>`,
        );
      }
      lines.push('');
    }

    lines.push('<b>⚡ THE REVEAL:</b>');
    lines.push(`<tg-spoiler>${escapeHtml(revealText)}</tg-spoiler>`);

    if (payoff.communityTension || payoff.surprisingOutcome) {
      const tacticalNote = payoff.surprisingOutcome || payoff.communityTension;
      lines.push(`\n<b>Tactical Reality:</b>\n<i>${escapeHtml(tacticalNote)}</i>`);
    }

    return lines.join('\n');
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
