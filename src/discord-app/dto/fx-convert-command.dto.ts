import { IntegerOption, StringOption } from 'necord';

export class FxConvertCommandDto {
  @StringOption({
    name: 'from',
    description: 'Currency to convert from (e.g., USD, JPY)',
    required: true,
  })
  from: string;

  @StringOption({
    name: 'to',
    description: 'Currency to convert to (e.g., USD, JPY)',
    required: true,
  })
  to: string;

  @IntegerOption({
    name: 'amount',
    description: 'Amount to convert (default: 1 for non-JPY, 1000 for JPY)',
    required: false,
  })
  amount?: number;
}
