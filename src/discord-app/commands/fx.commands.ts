import * as necord from 'necord';
import { CoinService } from '../../gmo/coin/coin.service';
import { FxConvertCommandDto } from '../dto/fx-convert-command.dto';
import { DiscordAppService } from '../discord-app.service';

// Fx command group (subcommands)
const FxCommand = necord.createCommandGroupDecorator({
  name: 'fx',
  description: 'Foreign exchange utilities',
});

@FxCommand()
export class FxCommands {
  constructor(
    private readonly coinService: CoinService,
    private readonly discordAppService: DiscordAppService,
  ) {}

  @necord.Subcommand({
    name: 'convert',
    description: 'Convert currency: /fx convert [from] [to] [amount]',
  })
  public async convert(
    @necord.Context() [interaction]: necord.SlashCommandContext,
    @necord.Options()
    { from: fromRaw, to: toRaw, amount: amountRaw }: FxConvertCommandDto,
  ) {
    try {
      if (!toRaw) {
        return interaction.reply({
          content: 'Please provide a target currency code (to).',
          ephemeral: true,
        });
      }

      const from = String(fromRaw).toUpperCase();
      const to = String(toRaw).toUpperCase();
      const amount =
        amountRaw != null ? Number(amountRaw) : from === 'JPY' ? 1000 : 1;

      if (from === to) {
        return interaction.reply({
          content: `${amount} ${from} = ${amount} ${to} (same currency)`,
          ephemeral: false,
        });
      }

      const ticker = await this.coinService.getTicker({
        updateDb: false,
        cache: true,
      });
      const items = ticker.data;

      // Convert DB responsetime to Discord timestamp (seconds)
      let dbTimeStr = '';
      try {
        const dbTs = this.discordAppService.isoToDiscordTimestamp(
          // ticker.responsetime is ISO string
          // fallback to empty string if missing to let isoToDiscordTimestamp throw
          ticker.responsetime as unknown as string,
        );
        dbTimeStr = `\nDB updated: <t:${dbTs}:F>`;
      } catch (e) {
        // If conversion fails, ignore and don't append timestamp
        dbTimeStr = '';
      }

      const findSymbol = (a: string, b: string) =>
        items.find((it) => it.symbol === `${a}_${b}`);

      const direct = findSymbol(from, to);
      if (direct) {
        const ask = Number(direct.ask);
        const bid = Number(direct.bid);
        const mid = (ask + bid) / 2;
        const converted = mid * amount;
        return interaction.reply({
          content: `${amount} ${from} = ${converted.toFixed(6)} ${to} (rate ${mid.toFixed(6)})${dbTimeStr}`,
        });
      }

      const inverse = findSymbol(to, from);
      if (inverse) {
        const ask = Number(inverse.ask);
        const bid = Number(inverse.bid);
        const mid = (ask + bid) / 2;
        const rate = 1 / mid;
        const converted = rate * amount;
        return interaction.reply({
          content: `${amount} ${from} = ${converted.toFixed(6)} ${to} (rate ${rate.toFixed(6)} via inverse ${to}_${from})${dbTimeStr}`,
        });
      }

      const mediators = ['JPY', 'USD', 'EUR'];
      for (const med of mediators) {
        if (med === from || med === to) continue;
        const a = findSymbol(from, med);
        const b = findSymbol(med, to);
        if (a && b) {
          const midA = (Number(a.ask) + Number(a.bid)) / 2;
          const midB = (Number(b.ask) + Number(b.bid)) / 2;
          const rate = midA * midB;
          const converted = rate * amount;
          return interaction.reply({
            content: `${amount} ${from} = ${converted.toFixed(6)} ${to} (via ${med}, rate ${rate.toFixed(6)})${dbTimeStr}`,
          });
        }
        const ai = findSymbol(med, from);
        const bi = findSymbol(to, med);
        if (ai && bi) {
          const midAi = (Number(ai.ask) + Number(ai.bid)) / 2;
          const midBi = (Number(bi.ask) + Number(bi.bid)) / 2;
          const rate = (1 / midAi) * (1 / midBi);
          const converted = rate * amount;
          return interaction.reply({
            content: `${amount} ${from} = ${converted.toFixed(6)} ${to} (via ${med} using inverses)${dbTimeStr}`,
          });
        }
      }

      return interaction.reply({
        content: `Could not find conversion path between ${from} and ${to}${dbTimeStr}`,
        ephemeral: true,
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: `Error while converting currencies${'' /* don't reveal db time on error */}`,
        ephemeral: true,
      });
    }
  }
}
