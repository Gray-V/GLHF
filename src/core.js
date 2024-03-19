export function program(statements) {
    return {
        kind: "Program",
        statements
    }
}

export function assignment(target, source) {
    return {
        kind: "Assignment",
        target,
        source
    }
}

export function variableDeclaration(variable, initializer) {
    return {
        kind: "VariableDeclaration",
        variable,
        initializer
    }
}

export function functionDeclaration(func, params, body) {
    return {
        kind: "FunctionDeclaration",
        func,
        params,
        body
    }
}