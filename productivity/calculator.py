"""
Safe arithmetic evaluation — no eval() on arbitrary strings.
Supports + - * / % ** ( ) and decimals only.
"""
from __future__ import annotations

import ast
import operator
from typing import Union

Number = Union[int, float]

_ALLOWED_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


class CalculatorError(Exception):
    pass


def _eval_node(node: ast.AST) -> Number:
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise CalculatorError("Only numeric constants are allowed")
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_OPS:
        return _ALLOWED_OPS[type(node.op)](_eval_node(node.left), _eval_node(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_OPS:
        return _ALLOWED_OPS[type(node.op)](_eval_node(node.operand))
    raise CalculatorError("Expression contains disallowed operations")


def evaluate(expression: str) -> str:
    try:
        tree = ast.parse(expression, mode="eval")
        result = _eval_node(tree.body)
        if isinstance(result, float) and result.is_integer():
            result = int(result)
        return f"That's {result}."
    except ZeroDivisionError:
        return "I can't divide by zero."
    except (CalculatorError, SyntaxError, TypeError, ValueError):
        return "I couldn't parse that as a calculation."
