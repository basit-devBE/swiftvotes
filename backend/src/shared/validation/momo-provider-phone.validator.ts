import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

import {
  MomoProvider,
  momoProviderPhoneMessage,
  phoneMatchesMomoProvider,
} from "./momo-phone";

@ValidatorConstraint({ name: "momoProviderPhone", async: false })
export class MomoProviderPhoneConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== "string" || !value.trim()) return true;

    const object = args.object as Record<string, unknown>;
    const provider = object[this.getProviderProperty(args)] as MomoProvider | undefined;
    if (!provider) return true;

    return phoneMatchesMomoProvider(value, provider);
  }

  defaultMessage(args: ValidationArguments): string {
    const object = args.object as Record<string, unknown>;
    const provider = object[this.getProviderProperty(args)] as MomoProvider | undefined;
    if (!provider) {
      return "Phone number does not match the selected network.";
    }
    return momoProviderPhoneMessage(provider);
  }

  private getProviderProperty(args: ValidationArguments): string {
    return (args.constraints?.[0] as string | undefined) ?? "momoProvider";
  }
}

export function IsMatchingMomoProviderPhone(
  providerProperty: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: "momoProviderPhone",
      target: object.constructor,
      propertyName: String(propertyName),
      constraints: [providerProperty],
      options: validationOptions,
      validator: MomoProviderPhoneConstraint,
    });
  };
}
